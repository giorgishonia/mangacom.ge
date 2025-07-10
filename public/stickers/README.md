# Stickers for MangAnime Comment System

This directory contains stickers that can be used in the comment system of the MangAnime platform.

## Structure

- `manga/` - Manga reaction stickers
- `comics/` - Comics reaction stickers (if different from manga)
- `generic/` - Generic reaction stickers (e.g., thumbs up, lol, heart)

Each subdirectory should contain PNG or GIF files for the stickers.

## Usage

When a user wants to add a sticker to their comment, the frontend should display a picker that shows stickers from these directories.
The path to the sticker (e.g., `/stickers/manga/happy.png`) will be stored with the comment.

## Adding New Stickers

To add more stickers to the application:

1. Add your GIF or PNG files to the appropriate category folder
2. Update the `STICKER_CATEGORIES` array in `components/sticker-selector.tsx` to include your new stickers

Example format for adding stickers:

```typescript
const STICKER_CATEGORIES = [
  {
    name: 'Category Name',
    stickers: [
      { id: 'unique-id-1', url: '/stickers/category/file.gif', alt: 'Description' },
      { id: 'unique-id-2', url: '/stickers/category/another.gif', alt: 'Description' },
      // Add more stickers here
    ]
  }
]
```

## Guidelines for Stickers

- Keep stickers small in file size (preferably under 500KB)
- Use GIF format for animated stickers
- Use PNG format for static stickers
- Keep dimensions reasonable (recommended 128x128px or 256x256px)
- Use descriptive alt text for accessibility
- Ensure stickers are appropriate for all ages

## Using External Stickers

You can also use stickers from external sources by providing full URLs:

```typescript
{
  id: 'external-1',
  url: 'https://example.com/sticker.gif',
  alt: 'Description'
}
```

However, be aware that external stickers may not be available if the external source is down or changes. 