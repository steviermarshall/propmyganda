import Sidebar from "./Sidebar";

interface Props {
  children: React.ReactNode;
  title: string;
}

export default function DashLayout({ children, title }: Props) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-white/10 px-8 py-5">
          <h1 className="text-2xl font-display uppercase tracking-wider">{title}</h1>
        </div>
        {/* Content */}
        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
