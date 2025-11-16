# Simple Site Generator

Generate production-ready, self-contained single-page websites as complete `index.html` files.

## Core Principles

- **Self-Contained**: Zero external dependencies except CDN-loaded libraries
- **React + TailwindCSS Required**: MUST use React 19+ and TailwindCSS 4+ via CDN for all sites
- **Production Quality**: Clean, performant code following modern best practices
- **Responsive & Accessible**: Mobile-first, WCAG 2.1 compliant with semantic HTML

## Use Cases

Landing pages, portfolios, interactive games, web apps, calculators, demos, prototypes, and educational content.

## Required Tech Stack

**MUST use for every site:**

- React 19+ via ESM modules using jsdelivr CDN with version pinning (`https://cdn.jsdelivr.net/npm/react@19.2.0/+esm`)
- React DOM 19+ with matching version (`https://cdn.jsdelivr.net/npm/react-dom@19.2.0/+esm`)
- TailwindCSS 4+ via CDN (`https://cdn.tailwindcss.com`)
- Modern ES6+ JavaScript modules with import/export syntax
- Babel standalone for JSX transformation

**Optional additions (via jsdelivr ESM with version pinning):**

- Three.js for 3D graphics: `https://cdn.jsdelivr.net/npm/three@[version]/+esm`
- Chart.js for data visualization: `https://cdn.jsdelivr.net/npm/chart.js@[version]/+esm`
- D3.js for data visualization: `https://cdn.jsdelivr.net/npm/d3@[version]/+esm`
- GSAP for advanced animations: `https://cdn.jsdelivr.net/npm/gsap@[version]/+esm`
- Any other npm packages via: `https://cdn.jsdelivr.net/npm/[package-name]@[version]/+esm`

**IMPORTANT**:

- Always prefer jsdelivr ESM format (`/+esm`) for better framework support and module resolution
- **Always include version numbers** in import map URLs (e.g., `@19.2.0`, `@3.0.0`)
- **Related packages must use matching versions** (e.g., `react@19.2.0` and `react-dom@19.2.0` must be the same version)
- Use specific versions to ensure compatibility and avoid breaking changes

## File Structure Template

The site generation workflow uses a pre-built template (`template.html`) that includes:

- Complete HTML structure with head section
- Meta tags and viewport settings
- ESM import map for React 19+ modules via jsdelivr CDN with version pinning
- TailwindCSS and Babel standalone
- A React App component structure with root div

**Your task is to replace the placeholder `// ========[APP_CONTENT_HERE]========`** and the `SampleApp` reference component with your actual React implementation.

The template structure is:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><!--========[PAGE_TITLE_HERE]========--></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js"></script>
    <script type="importmap">
      {
        "imports": {
          "react": "https://cdn.jsdelivr.net/npm/react@19.2.0/+esm",
          "react-dom": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/+esm",
          "react-dom/client": "https://cdn.jsdelivr.net/npm/react-dom@19.2.0/client/+esm"
        }
      }
    </script>
    <!--========[EXTRA_HEAD_CONTENT_HERE]========-->
  </head>
  <body>
    <div id="root"></div>

    <script type="text/babel" data-type="module">
      import React, { useState, useEffect } from "react";
      import { createRoot } from "react-dom/client";

      // ========[APP_CONTENT_HERE]========
      const SampleApp = () => {
        return <div className="min-h-screen bg-gray-50">This is template content.</div>;
      };

      createRoot(document.getElementById("root")).render(<SampleApp />);
    </script>
  </body>
</html>
```

**Important**:

- The template uses **ESM imports** via import map for better framework support
- React hooks and components are imported using standard ES6 import syntax
- Use `import React, { useState, useEffect } from "react"` syntax (already in template)
- The `SampleApp` component is just a placeholder - **replace it entirely** with your actual app component
- If you need additional libraries, add them to the import map in `EXTRA_HEAD_CONTENT_HERE` using jsdelivr ESM format

**Adding Additional Libraries**:
To add more libraries (e.g., Three.js, GSAP, Chart.js), replace the `EXTRA_HEAD_CONTENT_HERE` placeholder with additional import map entries. **Always include version numbers**:

```html
<!--========[EXTRA_HEAD_CONTENT_HERE]========-->
```

Replace with:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/+esm",
      "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm",
      "chart.js": "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm"
    }
  }
</script>
```

**CRITICAL**:

- Always specify version numbers (e.g., `@0.169.0`, `@3.12.5`)
- For packages with peer dependencies, ensure versions are compatible
- Related packages (like `react` and `react-dom`) must use the same version number

Then use standard imports in your code:

```javascript
import * as THREE from "three";
import gsap from "gsap";
import Chart from "chart.js";
```

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

1. Uses React 19+ and TailwindCSS 4+ via CDN with version pinning (mandatory)
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

1. **Template is already created**: The `index.html` file exists with the complete structure, ESM import map, TailwindCSS, Babel, and a placeholder section:

   ```javascript
   // ========[APP_CONTENT_HERE]========
   const SampleApp = () => {
     return <div className="min-h-screen bg-gray-50">This is template content.</div>;
   };

   createRoot(document.getElementById("root")).render(<SampleApp />);
   ```

2. **Replace the placeholder and SampleApp**: Use `edit_file` operation to replace the entire placeholder section (from `// ========[APP_CONTENT_HERE]========` through the render call) with your actual React components and implementation.

3. **CRITICAL - edit_file old_string must be SHORT**:
   - Keep `old_string` under 500 characters to prevent JSON truncation
   - The template provides a short placeholder: `// ========[APP_CONTENT_HERE]========`
   - **Replace the entire template section** including `SampleApp` and the render call with your actual implementation
   - For very large content, you can break it into multiple edits:
     1. First, replace the placeholder comment with your main component structure
     2. Then use additional `edit_file` calls with short `old_string` values to build up content incrementally
   - Use short, unique identifiers for subsequent edits:
     - Component names: `const SampleApp = () => {`
     - Specific JSX elements: `<div className="min-h-screen">`
     - Comments: `// Component logic here`

4. **Example workflow**:

   ```json
   {
     "operation": "edit_file",
     "site_id": "[site_id]",
     "file_path": "index.html",
     "old_string": "// ========[APP_CONTENT_HERE]========",
     "new_string": "// Your actual components here\nconst App = () => { /* ... */ };\n// More components..."
   }
   ```

   Then replace the SampleApp:

   ```json
   {
     "operation": "edit_file",
     "site_id": "[site_id]",
     "file_path": "index.html",
     "old_string": "const SampleApp = () => {\n        return <div className=\"min-h-screen bg-gray-50\">This is template content.</div>;\n      };",
     "new_string": "const App = () => {\n        // Your actual app implementation\n        return <div>...</div>;\n      };"
   }
   ```

   And update the render call:

   ```json
   {
     "operation": "edit_file",
     "site_id": "[site_id]",
     "file_path": "index.html",
     "old_string": "createRoot(document.getElementById(\"root\")).render(<SampleApp />);",
     "new_string": "createRoot(document.getElementById(\"root\")).render(<App />);"
   }
   ```

   **OR** do it all at once by replacing from the comment to the render call (if small enough).

5. **JSON Formatting**: When calling the tool, ensure:
   - All JSON arguments are properly formatted and complete
   - Special characters in content are properly escaped (especially quotes, backslashes)
   - The JSON string is closed properly with all required fields
   - `old_string` is kept SHORT (under 500 chars) - this is critical to prevent truncation
   - Always include `operation`, `site_id`, and `file_path` in every call

6. **Best Practice**:
   - Read the current file first to see the exact structure: `{"operation": "read_file", "site_id": "[site_id]", "file_path": "index.html"}`
   - Use standard ES6 import syntax (already provided in template): `import React, { useState, useEffect } from "react"`
   - Replace `// ========[APP_CONTENT_HERE]========` with your component definitions
   - Replace `SampleApp` with your actual App component
   - Update the render call to use your App component name
   - If you need additional libraries, add them to the import map using jsdelivr ESM format **with version numbers**
   - **Always include version numbers** when adding packages to import map (e.g., `@19.2.0`, `@3.12.5`)
   - **Ensure related packages use matching versions** (e.g., react and react-dom must be the same version)
   - Build up content incrementally if needed, using short unique identifiers for intermediate steps
   - Ensure your React components are complete and functional before finishing
