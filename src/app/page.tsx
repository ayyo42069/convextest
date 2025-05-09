import { Chat } from "@/components/chat";
import { ConvexClientProvider } from "@/components/providers";

export default function Home() {
  return (
    <ConvexClientProvider>
      <main className="min-h-screen w-full h-full bg-gray-50">
        <Chat />
      </main>
    </ConvexClientProvider>
  );
}
