import * as React from "react"
import { Command, File, X } from "lucide-react"
import { CommandList, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "cmdk"

// Mock file data
const mockFiles = [
  { id: "1", name: "index.tsx", path: "/app/index.tsx" },
  { id: "2", name: "layout.tsx", path: "/app/layout.tsx" },
  { id: "3", name: "page.tsx", path: "/app/page.tsx" },
  { id: "4", name: "globals.css", path: "/app/globals.css" },
  { id: "5", name: "components/button.tsx", path: "/components/button.tsx" },
  { id: "6", name: "components/input.tsx", path: "/components/input.tsx" },
  { id: "7", name: "lib/utils.ts", path: "/lib/utils.ts" },
  { id: "8", name: "tailwind.config.js", path: "/tailwind.config.js" },
]

type FileTag = {
  id: string
  name: string
  path: string
}

type Token = {
  id: string
  type: "text" | "file"
  content: string
  file?: FileTag
}

export function FileMentionInput() {
  const [tokens, setTokens] = React.useState<Token[]>([{ id: "initial", type: "text", content: "" }])
  const [inputValue, setInputValue] = React.useState("")
  const [cursorPosition, setCursorPosition] = React.useState(0)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [suggestionQuery, setSuggestionQuery] = React.useState("")
  const [activeTokenIndex, setActiveTokenIndex] = React.useState(0)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filter files based on the query
  const filteredFiles = React.useMemo(() => {
    if (!suggestionQuery) return mockFiles
    const query = suggestionQuery.toLowerCase().trim()
    return mockFiles.filter(
      (file) => file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query),
    )
  }, [suggestionQuery])

  // Focus the input when clicking on the container
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      inputRef.current?.focus()
    }
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Check for @ symbol
    if (value.includes("@")) {
      const atIndex = value.lastIndexOf("@")
      const query = value.substring(atIndex + 1)
      setSuggestionQuery(query)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && inputValue === "" && tokens.length > 0) {
      // Remove the last token if it's a file tag
      const lastToken = tokens[tokens.length - 1]
      if (lastToken.type === "file") {
        const newTokens = [...tokens]
        newTokens.pop()
        setTokens(newTokens)
      }
    } else if (e.key === "Escape" && showSuggestions) {
      setShowSuggestions(false)
      e.preventDefault()
    } else if (e.key === "Enter" && showSuggestions && filteredFiles.length > 0) {
      selectFile(filteredFiles[0])
      e.preventDefault()
    }
  }

  // Select a file from suggestions
  const selectFile = (file: FileTag) => {
    // Create a new file token
    const fileToken: Token = {
      id: `file-${Date.now()}`,
      type: "file",
      content: file.name,
      file,
    }

    // Add the file token and a new empty text token
    const newTextToken: Token = {
      id: `text-${Date.now()}`,
      type: "text",
      content: "",
    }

    // If the current input has an @ symbol, split it
    if (inputValue.includes("@")) {
      const atIndex = inputValue.lastIndexOf("@")
      const textBefore = inputValue.substring(0, atIndex)

      // Update the current text token with text before @
      const newTokens = [...tokens]
      if (newTokens[newTokens.length - 1].type === "text") {
        newTokens[newTokens.length - 1].content = textBefore
      }

      // Add the file token and a new empty text token
      setTokens([...newTokens, fileToken, newTextToken])
    } else {
      // Just add the file token after the current text
      setTokens([...tokens, fileToken, newTextToken])
    }

    // Reset input and suggestions
    setInputValue("")
    setShowSuggestions(false)

    // Focus back on the input
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Remove a file tag
  const removeFileTag = (tokenId: string) => {
    const tokenIndex = tokens.findIndex((t) => t.id === tokenId)
    if (tokenIndex === -1) return

    const newTokens = [...tokens]

    // Remove the file token
    newTokens.splice(tokenIndex, 1)

    // If there are two adjacent text tokens now, merge them
    if (
      tokenIndex > 0 &&
      tokenIndex < newTokens.length &&
      newTokens[tokenIndex - 1].type === "text" &&
      newTokens[tokenIndex].type === "text"
    ) {
      newTokens[tokenIndex - 1].content += newTokens[tokenIndex].content
      newTokens.splice(tokenIndex, 1)
    }

    setTokens(newTokens)

    // Focus back on the input
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Combine all tokens into a single string for demonstration
    const value = tokens
      .map((token) => {
        if (token.type === "text") return token.content
        return `@[${token.file?.name}](${token.file?.path})`
      })
      .join("")

    console.log("Submitted value:", value)
    console.log("Tokens:", tokens)

    // You could send this to your backend or process it further
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div
          ref={containerRef}
          className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-1 focus-within:ring-ring"
          onClick={handleContainerClick}
        >
          {tokens.map((token, index) =>
            token.type === "text" ? (
              index === tokens.length - 1 ? (
                <input
                  key={token.id}
                  ref={inputRef}
                  type="text"
                  className="flex-1 min-w-[120px] bg-transparent outline-hidden"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={tokens.length === 1 ? "Type @ to mention a file..." : ""}
                />
              ) : (
                <span key={token.id} className="inline-block">
                  {token.content}
                </span>
              )
            ) : (
              <span
                key={token.id}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-sm text-primary"
              >
                <File className="h-3 w-3" />
                {token.file?.name}
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-primary/20"
                  onClick={() => removeFileTag(token.id)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove</span>
                </button>
              </span>
            ),
          )}
        </div>

        {showSuggestions && (
          <div className="relative">
            <div className="absolute z-10 w-full mt-1 shadow-md">
              <Command>
                <CommandList>
                  <CommandInput
                    placeholder="Search files..."
                    value={suggestionQuery}
                    onValueChange={setSuggestionQuery}
                  />
                  <CommandEmpty>No files found.</CommandEmpty>
                  <CommandGroup heading="Files">
                    {filteredFiles.map((file) => (
                      <CommandItem key={file.id} value={file.path} onSelect={() => selectFile(file)}>
                        <File className="mr-2 h-4 w-4" />
                        <span>{file.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{file.path}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>
        )}

        <div className="mt-4">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  )
}

