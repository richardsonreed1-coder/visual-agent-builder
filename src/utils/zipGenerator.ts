import JSZip from 'jszip';
import { DirectoryExport } from '../types/core';

/**
 * Download files as a ZIP archive
 */
export const downloadAsZip = async (files: DirectoryExport, filename: string = 'ai-os-export.zip'): Promise<void> => {
  const zip = new JSZip();

  // Add each file to the ZIP
  Object.entries(files).forEach(([path, content]) => {
    if (content !== undefined) {
      zip.file(path, content);
    }
  });

  // Generate the ZIP
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // Download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate a preview of the directory structure
 */
export const generateDirectoryTree = (files: DirectoryExport): string => {
  const paths = Object.keys(files).filter(p => files[p] !== undefined).sort();
  const lines: string[] = ['.'];

  // Build tree structure
  interface TreeNode { [key: string]: TreeNode | null }
  const tree: TreeNode = {};

  paths.forEach(path => {
    const parts = path.split('/');
    let current: TreeNode = tree;
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? null : {};
      }
      if (current[part] !== null) {
        current = current[part] as TreeNode;
      }
    });
  });

  // Render tree
  const renderTree = (node: TreeNode, prefix: string = '') => {
    const keys = Object.keys(node);
    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      lines.push(prefix + connector + key);

      if (node[key] !== null) {
        renderTree(node[key], prefix + childPrefix);
      }
    });
  };

  renderTree(tree);

  return lines.join('\n');
};
