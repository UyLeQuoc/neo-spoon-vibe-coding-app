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

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="...">
    <title>...</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18",
        "react-dom/client": "https://esm.sh/react-dom@18/client"
      }
    }
    </script>
    
    <script type="module">
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        
        // React components here
        const App = () => {
          return (
            <div className="min-h-screen bg-gray-50">
              {/* TailwindCSS classes for styling */}
            </div>
          );
        };
        
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
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

1. Uses React 18+ and TailwindCSS 4+ via CDN (mandatory)
2. Is well-formatted with clear component structure
3. Includes inline comments for key sections
4. Has zero external file dependencies (except CDN imports)
5. Works immediately in any modern browser
6. Is responsive across mobile, tablet, and desktop
7. Follows accessibility best practices
8. Delivers a polished, production-ready experience

**Critical**: Every site must leverage React components for interactivity and TailwindCSS utility classes for styling. This ensures cleaner, more maintainable code with less boilerplate.
