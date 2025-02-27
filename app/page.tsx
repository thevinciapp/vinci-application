import CommandButton, { TypedCommandButton } from "@/components/CommandButton";
import { MessageSquare, Users, Brain, Play } from 'lucide-react';

export default async function Home() {
  return (
    <>
      <main className="flex-1 flex flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-xl">Spatial Command System</h2>
          <CommandButton />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-2">Use Keyboard Shortcut</h3>
            <p className="text-muted-foreground mb-4">
              Press <kbd className="px-2 py-1 rounded bg-muted border">⌘K</kbd> to open the command menu from anywhere.
            </p>
            <p className="text-muted-foreground text-sm">
              Type-specific shortcuts:
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div><kbd className="px-2 py-1 rounded bg-muted border">⌘S</kbd> Spaces</div>
                <div><kbd className="px-2 py-1 rounded bg-muted border">⌘T</kbd> Conversations</div>
                <div><kbd className="px-2 py-1 rounded bg-muted border">⌘M</kbd> Models</div>
                <div><kbd className="px-2 py-1 rounded bg-muted border">⌘A</kbd> Actions</div>
              </div>
            </p>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-2">Extensible Design</h3>
            <p className="text-muted-foreground">
              The command system is built to be extensible. Add new commands for any part of the application.
            </p>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-2">Organized By Categories</h3>
            <p className="text-muted-foreground">
              Commands are organized into categories: application, spaces, conversations, models, and actions.
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-4">Type-Specific Command Buttons</h3>
          <div className="flex flex-wrap gap-3">
            <TypedCommandButton 
              type="spaces" 
              label="Spaces" 
              icon={<Users className="h-4 w-4" />}
              shortcutKeys={["⌘", "S"]}
            />
            <TypedCommandButton 
              type="conversations" 
              label="Conversations" 
              icon={<MessageSquare className="h-4 w-4" />}
              shortcutKeys={["⌘", "T"]}
            />
            <TypedCommandButton 
              type="models" 
              label="Models" 
              icon={<Brain className="h-4 w-4" />}
              shortcutKeys={["⌘", "M"]}
            />
            <TypedCommandButton 
              type="actions" 
              label="Actions" 
              icon={<Play className="h-4 w-4" />}
              shortcutKeys={["⌘", "A"]}
            />
          </div>
        </div>
      </main>
    </>
  );
}
