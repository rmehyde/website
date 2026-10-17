#!/usr/bin/env python3
"""Print a profile-vs-profile table of pairwise distances.

Reads content/profiles.yaml and emits a square table whose rows and columns are
both the profiles. Each cell holds two numbers, "<absolute> / <cosine>":

  - absolute: sum of absolute-value differences across every dimension. A
    dimension absent from a profile is treated as an implicit 0.
  - cosine:   cosine similarity of the two score vectors (1.000 == identical
    direction, 0.000 == orthogonal).
"""

import math
from pathlib import Path

import yaml
from tabulate import tabulate

# profiles.yaml lives at <repo>/content/profiles.yaml; this script is in <repo>/scripts.
PROFILES_PATH = Path(__file__).resolve().parent.parent / "content" / "profiles.yaml"


def load_profiles(path):
    """Return [(name, scores_dict), ...] in file order."""
    with open(path) as f:
        profiles = yaml.safe_load(f)
    return [(p["name"].replace(" Engineer", ""), p.get("scores") or {}) for p in profiles]


def absolute_distance(a, b, dimensions):
    """Sum of |a - b| over all dimensions, absent dimensions counting as 0."""
    return sum(abs(a.get(dim, 0) - b.get(dim, 0)) for dim in dimensions)


def cosine_similarity(a, b, dimensions):
    """Cosine similarity of the two score vectors over the shared dimension space."""
    dot = sum(a.get(dim, 0) * b.get(dim, 0) for dim in dimensions)
    norm_a = math.sqrt(sum(a.get(dim, 0) ** 2 for dim in dimensions))
    norm_b = math.sqrt(sum(b.get(dim, 0) ** 2 for dim in dimensions))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def main():
    profiles = load_profiles(PROFILES_PATH)
    names = [name for name, _ in profiles]

    # Union of every dimension seen across all profiles.
    dimensions = set()
    for _, scores in profiles:
        dimensions.update(scores)

    rows = []
    for row_name, row_scores in profiles:
        cells = [row_name]
        for _, col_scores in profiles:
            dist = absolute_distance(row_scores, col_scores, dimensions)
            cos = cosine_similarity(row_scores, col_scores, dimensions)
            cells.append(f"{dist:g} / {cos:.3f}")
        rows.append(cells)

    print(tabulate(rows, headers=[""] + names, tablefmt="grid"))


if __name__ == "__main__":
    main()
