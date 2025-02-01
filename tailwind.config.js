/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-header': '#2d2d2d',
        'vscode-hover': '#2a2d2e',
        'vscode-active': '#37373d',
        'vscode-border': '#333',
        'vscode-text': '#d4d4d4',
      }
    },
  },
  plugins: [],
} 