# Simple Site Generator

Generate production-ready, self-contained single-page websites as complete `index.html` files.

## Core Principles

- **Self-Contained**: Zero external dependencies except CDN-loaded libraries
- **React + TailwindCSS Required**: MUST use React 18+ and TailwindCSS 4+ via CDN for all sites
- **Production Quality**: Clean, performant code following modern best practices
- **Responsive & Accessible**: Mobile-first, WCAG 2.1 compliant with semantic HTML

## Use Cases

Landing pages, portfolios, interactive games, web apps, calculators, demos, prototypes, and educational content.

## Required Tech Stack

**MUST use for every site:**

- React 18+ via CDN (esm.sh or unpkg)
- TailwindCSS 4+ via CDN with JIT mode
- Modern ES6+ JavaScript modules

**Optional additions:**

- Three.js for 3D graphics
- Chart.js/D3.js for data visualization
- GSAP for advanced animations

## File Structure Template

The site generation workflow uses a pre-built template (`template.html`) that includes:

- Complete HTML structure with head section
- Meta tags and viewport settings
- Required CDN links for React 18+, TailwindCSS, Babel, and Marked
- A React App component structure with root div

**Your task is to replace the placeholder `// ========[APP_CONTENT_HERE]========`** with your React components and content.

The template structure is:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[Already set based on requirements]</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  </head>
  <body class="bg-gray-100 p-6">
    <div id="root"></div>
    <script type="text/babel">
      const { useState, useEffect } = React;
      
      const App = () => {
          return (
              <div className="min-h-screen bg-gray-50">
                  // ========[APP_CONTENT_HERE]========
              </div>
          );
      }
      
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
  </body>
</html>
```

**Important**: The template already includes all CDN links and the basic React structure. You only need to replace `// ========[APP_CONTENT_HERE]========` with your components.

## Code Quality Standards

**HTML**: Semantic HTML5 elements, proper meta tags, meaningful attributes, valid markup

**React Components**: Functional components with hooks, clear prop types, logical separation of concerns

**TailwindCSS**: Mobile-first responsive classes, consistent spacing/colors, utility-first approach

**JavaScript**: Modern ES6+ (arrow functions, destructuring, async/await), error handling, clean code

**Performance**: Optimize inline resources, efficient rendering, lazy load when needed, keep file size < 500KB

## Design Requirements

- Consistent color palette (3-5 colors)
- Adequate contrast ratios (4.5:1 minimum for text)
- Effective whitespace and alignment
- Readable typography (16px+ for body text)
- Clear call-to-action elements
- Visual feedback for interactions (hover, focus, active states)
- Loading states for async operations
- Graceful error handling with user-friendly messages
- Keyboard navigation support

## Output Requirements

Generate a complete, self-contained `index.html` file that:

1. Uses React 18+ and TailwindCSS 4+ via CDN (mandatory)
2. Is well-formatted with clear component structure
3. Includes inline comments for key sections
4. Has zero external file dependencies (except CDN imports)
5. Works immediately in any modern browser
6. Is responsive across mobile, tablet, and desktop
7. Follows accessibility best practices
8. Delivers a polished, production-ready experience

**Critical**: Every site must leverage React components for interactivity and TailwindCSS utility classes for styling. This ensures cleaner, more maintainable code with less boilerplate.

## Using the manage_site_files Tool

The site generation workflow has already created `index.html` from a template. Your task is to replace the placeholder with your React components.

### Workflow

1. **Template is already created**: The `index.html` file exists with the complete structure, CDN links, and a placeholder:

   ```html
   // ========[APP_CONTENT_HERE]========
   ```

2. **Replace the placeholder**: Use `edit_file` operation to replace `// ========[APP_CONTENT_HERE]========` with your React components and content.

3. **CRITICAL - edit_file old_string must be SHORT**:
   - Keep `old_string` under 200 characters to prevent JSON truncation
   - The template provides the perfect short placeholder: `// ========[APP_CONTENT_HERE]========`
   - For large content, you can break it into multiple edits:
     1. First, replace the placeholder with a basic structure
     2. Then use additional `edit_file` calls with short `old_string` values to build up the content incrementally
   - Use short, unique identifiers for subsequent edits:
     - HTML comments: `<!-- SECTION_NAME -->`
     - Single unique lines: `<div className="...">`
     - Short closing tags: `</div>`, `</section>`, etc.

4. **Example workflow**:

   ```json
   {
     "operation": "edit_file",
     "site_id": "[site_id]",
     "file_path": "index.html",
     "old_string": "// ========[APP_CONTENT_HERE]========",
     "new_string": "<header>...</header><main>...</main><footer>...</footer>"
   }
   ```

   If the content is very large, break it into steps:

   ```json
   // Step 1: Replace placeholder with header
   {
     "operation": "edit_file",
     "site_id": "[site_id]",
     "file_path": "index.html",
     "old_string": "// ========[APP_CONTENT_HERE]========",
     "new_string": "<header>...</header><!-- MAIN_CONTENT -->"
   }
   
   // Step 2: Add main content
   {
     "operation": "edit_file",
     "site_id": "[site_id]",
     "file_path": "index.html",
     "old_string": "<!-- MAIN_CONTENT -->",
     "new_string": "<main>...</main>"
   }
   ```

5. **JSON Formatting**: When calling the tool, ensure:
   - All JSON arguments are properly formatted and complete
   - Special characters in content are properly escaped (especially quotes, backslashes)
   - The JSON string is closed properly with all required fields
   - `old_string` is kept SHORT (under 200 chars) - this is critical to prevent truncation
   - Always include `operation`, `site_id`, and `file_path` in every call

6. **Best Practice**:
   - Read the current file first to see the exact structure: `{"operation": "read_file", "site_id": "[site_id]", "file_path": "index.html"}`
   - Start by replacing the main placeholder `// ========[APP_CONTENT_HERE]========`
   - Build up content incrementally if needed, using short placeholder comments for intermediate steps
   - Ensure your React components are complete and functional before finishing
