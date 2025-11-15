import type { InferUITool } from 'ai'
import { z } from 'zod'

const generateSiteParameters = z.object({
  site_type: z
    .string()
    .optional()
    .describe(
      "Optional: Type of site to generate (e.g., 'landing page', 'portfolio', 'game', 'dashboard', 'web app'). If not specified, will be inferred from requirements."
    ),
  requirements: z
    .string()
    .describe(
      'Detailed requirements and specifications for the website including features, design preferences, and functionality'
    ),
  style_preferences: z
    .string()
    .optional()
    .describe('Optional styling preferences like color scheme, modern/minimal design, animations, etc.')
})

export const generateSiteTool = {
  description:
    'Generate a complete, production-ready single-page website and save it to disk. ' +
    'Returns structured JSON with site information including site_id (for use with manage_site_files), ' +
    'URL, requirements, and metadata. Use this to create landing pages, portfolios, games, ' +
    'dashboards, or web apps from scratch.',
  inputSchema: generateSiteParameters
} as const

const manageSiteFilesParameters = z.object({
  operation: z
    .enum(['create_file', 'edit_file', 'read_file', 'delete_file'])
    .describe(
      'REQUIRED: File operation to perform: create_file, edit_file (replace strings), read_file, or delete_file. Must be included in every tool call.'
    ),
  site_id: z
    .string()
    .describe(
      'REQUIRED: Unique site identifier (timestamp format: YYYYMMDD_HHMMSS). Must be included in every tool call. Get this value from the context/prompt.'
    ),
  file_path: z
    .string()
    .describe(
      "REQUIRED: Relative path to file within site directory (e.g., 'index.html', 'styles.css'). Must be included in every tool call."
    ),
  content: z
    .string()
    .optional()
    .describe(
      'File content for create_file operation. Required for create_file. For large files, ensure JSON is properly escaped and complete.'
    ),
  old_string: z
    .string()
    .optional()
    .describe(
      'String to find and replace in edit_file operation. Required for edit_file. CRITICAL: Keep this SHORT (under 200 characters) to avoid JSON truncation. Use a unique, small identifier like a comment, a single line, or a short unique string. For large replacements, break into multiple smaller edits.'
    ),
  new_string: z
    .string()
    .optional()
    .describe(
      'Replacement string for edit_file operation. Required for edit_file. Can be longer than old_string, but if very long, consider breaking into multiple edits.'
    )
})

export const manageSiteFilesTool = {
  description:
    'Manage files in generated sites. Create new files, edit existing files (replace strings), ' +
    'read file content, or delete files. Use this to update or modify existing generated sites. ' +
    'CRITICAL: ALL tool calls MUST include these three required parameters: operation, site_id, and file_path. ' +
    'Example: {"operation": "edit_file", "site_id": "20251115_123456", "file_path": "index.html", "old_string": "<!-- PLACEHOLDER -->", "new_string": "<div>content</div>"}. ' +
    'When creating files with large content, ensure the JSON arguments are properly formatted and complete. ' +
    'For very large files, consider creating a basic structure first, then using edit_file to add content incrementally.',
  inputSchema: manageSiteFilesParameters
} as const

export interface ToolSet {
  generate_site: InferUITool<typeof generateSiteTool>
  manage_site_files: InferUITool<typeof manageSiteFilesTool>
  [key: string]: InferUITool<typeof generateSiteTool> | InferUITool<typeof manageSiteFilesTool>
}
