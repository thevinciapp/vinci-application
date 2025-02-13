// Shared styles for command items across all lists
export const commandItemClass = (isActive?: boolean) => `
  group relative flex items-center gap-3 mx-2 my-1 px-4 py-3 text-sm outline-none
  transition-all duration-200 rounded-lg
  data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white
  hover:bg-white/[0.08] hover:border-white/20
  ${isActive
    ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)] text-white'
    : 'text-white/90 border border-transparent'
  }
`;
