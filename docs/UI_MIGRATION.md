# UI Components Migration Guide

This document outlines the process for migrating UI components from custom implementations to the shared vinci-ui library.

## Overview

We've created a centralized component library (`vinci-ui`) that contains all our shared UI components. This migration process involves replacing imports from custom UI components with direct imports from the vinci-ui library.

## Implementation Steps

1. **Link the vinci-ui library to vinci-application**
   ```bash
   cd /path/to/vinci-ui
   bun link -c
   
   cd /path/to/vinci-application
   bun link vinci-ui
   ```

2. **Add vinci-ui CSS to globals.css**
   ```css
   @import 'tailwindcss';
   @import 'vinci-ui/dist/styles.css';
   /* rest of your CSS */
   ```

3. **Replace custom imports with vinci-ui imports**
   Replace:
   ```typescript
   import { Button } from '@/components/ui/common/button';
   ```
   
   With:
   ```typescript
   import { Button } from 'vinci-ui';
   ```

4. **Group related components imports**
   For components that are used together, import them in a single import statement:
   ```typescript
   import {
     Dialog,
     DialogContent,
     DialogHeader,
     DialogTitle,
     DialogTrigger,
     Button
   } from 'vinci-ui';
   ```

## Component Equivalents

| Custom Component | vinci-ui Component |
|------------------|-------------------|
| Button | Button |
| Dialog | Dialog |
| Command | Command |
| BaseTab | BaseTab |
| etc. | etc. |

## Troubleshooting

If you encounter styling issues:
1. Check that the CSS is properly imported
2. Verify that the component props are correctly passed
3. Consider using the `className` prop to override specific styles

## Migration Status

- [x] Set up vinci-ui link
- [x] Import CSS in globals.css
- [x] Migrate command components
- [ ] Migrate remaining UI components
- [ ] Remove deprecated custom UI components

## Best Practices

- Import multiple related components in a single import statement
- Use the component variants defined in the vinci-ui library
- For component customization, use the className prop rather than creating new components
- If you need to override component styles extensively, consider extending the component API in vinci-ui rather than creating a custom version