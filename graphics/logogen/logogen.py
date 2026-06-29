from pydantic import BaseModel

# Base stroke colour: black in light mode, white in dark mode (via a CSS media
# query baked into the SVG). The cap keeps its own colour and is unaffected.
LIGHT_BASE = "#000000"
DARK_BASE = "#ffffff"

class Roundedness(BaseModel):
    top_left: float = 20.
    top_right: float = 20.
    mid_right_up: float = 20.
    mid_right_down: float = 20.

class LogoParams(BaseModel):
    width: int = 130
    height: int = 200
    line_thickness: float = 20
    crossbar_pos: float = 0.5   # 0 = top, 1 = bottom (relative)
    cap_color: str = "#000000"
    roundedness: Roundedness | float = 20.
    cap_overlap: float | None = None   # cap extends this far down the verticals to
                                        # hide the colour-boundary seam; None -> t/4
    square: bool = True         # pad the artwork into a square viewBox (favicon-ready)
    padding: float = 0.08       # margin per side as a fraction of the larger dimension


def generate_logo_svg(
    params: LogoParams = LogoParams(),
    allow_invalid: bool = False,
) -> str:
    """
    Generate an SVG for an H-like logo where:
      - left vertical is straight
      - top bar is straight
      - right vertical is split into upper + lower with a middle bar
      - top-left, top-right, and both middle-right stroke corners are
        explicit quarter-circle arcs ("protractor turns")
      - middle-left corner is sharp

    width, height: total size of the artwork (before any squaring)
    line_thickness: stroke width of all segments
    crossbar_pos: vertical position of middle bar as a fraction of height (0..1 from top)
    roundedness: geometric radius r of the curved corners (in SVG units)
    square: pad the artwork into a square viewBox (favicon-ready output)
    padding: margin per side as a fraction of the larger dimension, when squaring

    The base strokes are emitted black with a `prefers-color-scheme: dark` media
    query that flips them to white; the cap keeps its own colour.
    """
    # pull out params
    width = params.width
    height = params.height
    line_thickness = params.line_thickness
    crossbar_pos = params.crossbar_pos
    cap_color = params.cap_color
    roundedness = params.roundedness
    cap_overlap = params.cap_overlap
    square = params.square
    padding = params.padding

    if isinstance(roundedness, (float, int)):
        roundedness = Roundedness(
            top_left=roundedness,
            top_right=roundedness,
            mid_right_up=roundedness,
            mid_right_down=roundedness,
        )

    # basic sanity and aliases
    if width < 10 or height < 10:
        raise ValueError(f"width ({width}) and height ({height}) must be at least 10")
    w = width
    h = max(10.0, float(height))
    if line_thickness < 1:
        raise ValueError(f"line thickness ({line_thickness}) must be at least 1")
    t = max(1.0, float(line_thickness))

    # centerlines: keep strokes inside the SVG by half a thickness
    x_left = t / 2.0
    x_right = w - t / 2.0
    y_top = t / 2.0
    y_bottom = h - t / 2.0

    # raw crossbar center, clamp to a reasonable vertical band
    y_mid_raw = float(crossbar_pos) * h
    y_mid = max(y_top + 2 * t, min(y_bottom - 2 * t, y_mid_raw))

    # choose per-corner radii that actually fit:
    # - can't exceed half the vertical gap from top to middle
    # - can't exceed half the vertical gap from middle to bottom
    # - can't exceed a fraction of the horizontal span
    max_r_vert_top = max(1.0, (y_mid - y_top) / 2.0)
    max_r_vert_bottom = max(1.0, (y_bottom - y_mid) / 2.0)
    max_r_horiz = max(1.0, (x_right - x_left) / 2.0)

    def _validate_corner(val: float, max_vert: float, max_horiz: float, name: str | None = None, allow_zero: bool = False) -> float:
        if allow_invalid:
            return val

        name = "corner" if name is None else f"{name} corner"
        if val < 1.0 and not allow_zero:
            raise ValueError(f"Roundedness for {name} must be at least 1, got {val}")
        elif val > max_vert or val > max_horiz:
            raise ValueError(
                f"Roundedness for {name} must be at most {min(max_vert, max_horiz)} based on provided height/width,"
                f" got {val}"
            )

        return val

    r_tl = _validate_corner(roundedness.top_left, max_r_vert_top, max_r_horiz, name="top left", allow_zero=True)
    r_tr = _validate_corner(roundedness.top_right,    max_r_vert_top,    max_r_horiz, name="top right")
    r_mru = _validate_corner(roundedness.mid_right_up,   max_r_vert_top,    max_r_horiz, name="mid-right up")
    r_mrd = _validate_corner(roundedness.mid_right_down, max_r_vert_bottom, max_r_horiz, name="mid-right down")

    # === key points (centerline coordinates) ===

    # left side
    BL = (x_left, y_bottom)  # bottom-left leg end
    TL_arc_start = (x_left, y_top + r_tl)        # where top-left arc starts on vertical
    TL_arc_end   = (x_left + r_tl, y_top)        # where top-left arc ends on horizontal

    # top bar
    TR_arc_start = (x_right - r_tr, y_top)       # where top-right arc starts on horizontal
    TR_arc_end   = (x_right, y_top + r_tr)       # where top-right arc ends on vertical

    # right vertical near middle (note separate radii for up/down)
    MR_up   = (x_right, y_mid - r_mru)           # just above the middle-right corner on vertical
    MR_down = (x_right, y_mid + r_mrd)           # just below the middle-right corner on vertical
    MR_join_up   = (x_right - r_mru, y_mid)      # where upper middle arc meets the bar
    MR_join_down = (x_right - r_mrd, y_mid)      # where lower middle arc meets the bar

    # middle-left
    ML = (x_left, y_mid)


    # === build continuous paths to avoid anti-aliasing seams ===
    #
    # Every junction in this logo is tangent (C1-continuous), so a run of
    # connected same-coloured segments can be emitted as ONE stroked <path>
    # (M / L / A). A single path is rasterised as a single stroke outline, so
    # it has no internal butt-cap joints and therefore none of the ~1px
    # "double-blend" seams that appear where two separate strokes merely abut.
    #
    # The H branches (the middle bar) and uses two colours, so it can't be a
    # single path. It decomposes into:
    #   - cap (cap_color):  top-left arc + top bar + top-right arc
    #   - left vertical (base)
    #   - "trunk" (base):   one right vertical + its middle arc + the whole
    #                       middle bar, out to the middle-left tip
    #   - "branch" (base):  the other right vertical + its middle arc, ending in
    #                       a short stub buried inside the bar
    #
    # The only butt joints left are the two cap/base colour boundaries (kept as
    # clean abutments — a seam there would sit on an intended colour edge) and
    # the branch's stub end (hidden inside the bar).
    #
    # Note: an arc traversed in reverse is the same arc with its endpoints
    # swapped and its sweep flag flipped, which is why the middle arcs below use
    # the opposite sweep flag from the forward (join -> vertical) description.

    base_paths = []

    # --- left vertical: bottom-left up to the top-left corner ---
    # (a sharp top-left corner extends up by t/2 to form the corner, as before)
    lvl_y2 = TL_arc_start[1] if r_tl > 0 else TL_arc_start[1] + t / 2
    base_paths.append(f'<path d="M {BL[0]} {BL[1]} L {x_left} {lvl_y2}" />')

    # --- right-middle hooks + middle bar ---
    # The bar reaches the rightmost of the two arc joins. The arc that joins
    # there continues the bar tangentially, so it carries the whole bar (the
    # "trunk"); the other arc joins further left, strictly inside the bar (the
    # "branch"). A short collinear stub keeps the branch's free end inside the
    # bar — this also covers the equal-radius case, where both arcs join exactly
    # at the bar's right end.
    if r_mru <= r_mrd:
        # trunk = upper vertical -> up-arc -> bar -> middle-left tip
        base_paths.append(
            f'<path d="M {TR_arc_end[0]} {TR_arc_end[1]} '
            f'L {MR_up[0]} {MR_up[1]} '
            f'A {r_mru} {r_mru} 0 0 1 {MR_join_up[0]} {MR_join_up[1]} '
            f'L {ML[0]} {ML[1]}" />'
        )
        # branch = lower vertical -> down-arc -> stub buried in the bar
        branch_stub = MR_join_down[0] - min(t / 2.0, (MR_join_down[0] - x_left) / 2.0)
        base_paths.append(
            f'<path d="M {x_right} {y_bottom} '
            f'L {MR_down[0]} {MR_down[1]} '
            f'A {r_mrd} {r_mrd} 0 0 0 {MR_join_down[0]} {MR_join_down[1]} '
            f'L {branch_stub} {ML[1]}" />'
        )
    else:
        # trunk = lower vertical -> down-arc -> bar -> middle-left tip
        base_paths.append(
            f'<path d="M {x_right} {y_bottom} '
            f'L {MR_down[0]} {MR_down[1]} '
            f'A {r_mrd} {r_mrd} 0 0 0 {MR_join_down[0]} {MR_join_down[1]} '
            f'L {ML[0]} {ML[1]}" />'
        )
        # branch = upper vertical -> up-arc -> stub buried in the bar
        branch_stub = MR_join_up[0] - min(t / 2.0, (MR_join_up[0] - x_left) / 2.0)
        base_paths.append(
            f'<path d="M {TR_arc_end[0]} {TR_arc_end[1]} '
            f'L {MR_up[0]} {MR_up[1]} '
            f'A {r_mru} {r_mru} 0 0 1 {MR_join_up[0]} {MR_join_up[1]} '
            f'L {branch_stub} {ML[1]}" />'
        )

    # --- cap: top-left arc + top bar + top-right arc, as one path ---
    # Extend the cap a little way down each vertical so it overlaps the base
    # strokes there. The cap is drawn on top of the (opaque) base, so the base
    # shows through right up to the cap's edge — no background can seam through
    # the colour boundary. The visible colour split just moves down by `overlap`,
    # so keep it small. Each nub is clamped so it can't run past its vertical.
    overlap = t / 4 if cap_overlap is None else max(0.0, float(cap_overlap))
    right_nub_y = min(TR_arc_end[1] + overlap, MR_up[1])
    if r_tl > 0:
        left_nub_y = min(TL_arc_start[1] + overlap, y_bottom)
        cap_path = (
            f'<path d="M {x_left} {left_nub_y} '
            f'L {TL_arc_start[0]} {TL_arc_start[1]} '
            f'A {r_tl} {r_tl} 0 0 1 {TL_arc_end[0]} {TL_arc_end[1]} '
            f'L {TR_arc_start[0]} {TR_arc_start[1]} '
            f'A {r_tr} {r_tr} 0 0 1 {TR_arc_end[0]} {TR_arc_end[1]} '
            f'L {x_right} {right_nub_y}" '
            f'stroke="{cap_color}" />'
        )
    else:
        # sharp top-left corner: no arc and no left nub — that corner already
        # overlaps via the t/2 extensions; the top bar extends left by t/2 to
        # overlap the (also-extended) left vertical, exactly as before
        tbl_x1 = TL_arc_end[0] - t / 2
        cap_path = (
            f'<path d="M {tbl_x1} {TL_arc_end[1]} '
            f'L {TR_arc_start[0]} {TR_arc_start[1]} '
            f'A {r_tr} {r_tr} 0 0 1 {TR_arc_end[0]} {TR_arc_end[1]} '
            f'L {x_right} {right_nub_y}" '
            f'stroke="{cap_color}" />'
        )

    # === assemble SVG (base first, cap drawn on top) ===

    base_svg = "\n    ".join(base_paths)

    # Square the canvas (favicon-ready) by centering the w x h artwork in a
    # max(w, h) box plus uniform padding. The geometry above stays in the
    # artwork's own coordinate space; only the outer viewBox and a centering
    # translate change.
    if square:
        art = max(w, h)
        margin = padding * art
        side = art + 2 * margin
        off_x = (side - w) / 2.0
        off_y = (side - h) / 2.0
        canvas = side
        group_transform = f' transform="translate({off_x} {off_y})"'
    else:
        canvas = None
        group_transform = ""

    view_w = canvas if square else w
    view_h = canvas if square else h

    # Base strokes: black in light mode (presentation attribute, so the logo
    # still renders if a rasteriser ignores CSS) and white in dark mode (the
    # media query overrides the attribute). The cap sets its own stroke and so
    # is unaffected in both modes.
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
     width="{view_w}" height="{view_h}" viewBox="0 0 {view_w} {view_h}">
  <style>
    @media (prefers-color-scheme: dark) {{ .base {{ stroke: {DARK_BASE}; }} }}
  </style>
  <g class="base" fill="none"
     stroke="{LIGHT_BASE}"
     stroke-width="{t}"
     stroke-linecap="butt"
     stroke-linejoin="round"{group_transform}>
    {base_svg}
    {cap_path}
  </g>
</svg>
"""
    return svg