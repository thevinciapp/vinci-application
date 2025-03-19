#\!/bin/bash

# List of provider files to update
PROVIDERS=(
  "/Users/dallenpyrah/Spatial/vinci-application/src/components/providers/ModelsProvider.tsx"
  "/Users/dallenpyrah/Spatial/vinci-application/src/components/providers/BackgroundTasksProvider.tsx"
  "/Users/dallenpyrah/Spatial/vinci-application/src/components/providers/MessageSearchProvider.tsx"
  "/Users/dallenpyrah/Spatial/vinci-application/src/components/providers/SimilarMessagesProvider.tsx"
  "/Users/dallenpyrah/Spatial/vinci-application/src/components/providers/SpacesProvider.tsx"
  "/Users/dallenpyrah/Spatial/vinci-application/src/components/providers/ChatModesProvider.tsx"
  "/Users/dallenpyrah/Spatial/vinci-application/src/components/providers/ConversationsProvider.tsx"
)

# Loop through each file and update the searchQuery parameter
for file in "${PROVIDERS[@]}"; do
  echo "Updating $file..."
  
  # Use sed to add a default value to searchQuery
  sed -i '' 's/export function \([A-Za-z]\+\)Provider({ searchQuery, /export function \1Provider({ searchQuery = "", /g' "$file"
  
  # Print the result
  grep -n "export function" "$file" | head -1
done

echo "All provider components updated."
