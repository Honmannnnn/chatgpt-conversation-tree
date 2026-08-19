import { useConversationTreeStore } from './store';
import { TreePanel } from './components/TreePanel';
import { FloatingButton } from './components/FloatingButton';

export function App() {
  const panelOpen = useConversationTreeStore((state) => state.panelOpen);

  return (
    <>
      <FloatingButton />
      {panelOpen ? <TreePanel /> : null}
    </>
  );
}
