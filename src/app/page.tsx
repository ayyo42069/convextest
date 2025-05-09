import { Chat } from "@/components/chat";
import { ConvexClientProvider } from "@/components/providers";

export default function Home() {
  return (
    <ConvexClientProvider>
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold text-center mb-8">Simple Chat</h1>
          <Chat />
        </div>
      </main>
    </ConvexClientProvider>
  );
}
