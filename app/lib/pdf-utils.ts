// import yaml from 'yaml';
// import { TeXLive } from 'texlive'; // adjust based on how you install it
//
// export interface ProjectContent {
//     priority: number;
//     title: string;
//     summary: string;
//     detail: string;
//     links: {
//         text: string;
//         detail: string;
//         target: string;
//     }[];
// }
//
// export async function loadProject(filePath: string): Promise<ProjectContent> {
//     const file = await fetch(filePath).then(res => res.text());
//     const data = yaml.parse(data) as ProjectContent;
//     return data;
// }
//
// export function generateLatex(project: ProjectContent): string {
//     const linksLatex = project.links
//         .map(link => `\\href{${link.target}}{${link.text}} -- ${link.detail}`)
//         .join('\\\\\n');
//
//     return `
// \\documentclass{article}
// \\usepackage{hyperref}
// \\begin{document}
//
// \\section*{${project.title}}
// \\textbf{Priority:} ${project.priority}\\\\
// \\textbf{Summary:} ${project.summary}\\\\
// \\textbf{Detail:} ${project.detail}\\\\
//
// \\textbf{Links:}
// \\\\
// ${linksLatex}
//
// \\end{document}
// `.trim();
// }
//
// export async function compileLatex(latexContent: string): Promise<Uint8Array> {
//     const tex = await TeXLive();
//     const output = await tex.compile(latexContent, { format: 'pdf' });
//     return output.pdf;
// }
//
// export function downloadPdf(pdfData: Uint8Array, filename: string) {
//     const blob = new Blob([pdfData], { type: 'application/pdf' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     a.click();
//     URL.revokeObjectURL(url);
// }
