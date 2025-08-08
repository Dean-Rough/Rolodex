# Rolodex Extension Icons

This directory contains the required icon files for the Chrome extension.

## Required Icons:
- `icon16.png` - 16x16 pixels, for toolbar and extension management page
- `icon48.png` - 48x48 pixels, for extension management page and context menus  
- `icon128.png` - 128x128 pixels, for Chrome Web Store and installation

## Icon Requirements:
- **Format**: PNG with transparency
- **Style**: Modern, professional, consistent with Rolodex brand
- **Content**: Represents furniture/interior design/product cataloging
- **Colors**: Should work on light and dark backgrounds

## Temporary Solution:
For development and testing, create simple placeholder icons:

```bash
# Create 16x16 placeholder (red square)
convert -size 16x16 xc:red icon16.png

# Create 48x48 placeholder (green square)  
convert -size 48x48 xc:green icon48.png

# Create 128x128 placeholder (blue square)
convert -size 128x128 xc:blue icon128.png
```

## Production Icons:
Replace these placeholders with professional icons designed according to:
- Chrome Extension Icon Guidelines
- Material Design principles
- Rolodex brand guidelines
- Accessibility standards (sufficient contrast)