import { useConversationTreeStore } from './store';
import { TreePanel } from './components/TreePanel';
import { FloatingButton } from './components/FloatingButton';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  const panelOpen = useConversationTreeStore((state) => state.panelOpen);

  return (
    <>
      <FloatingButton />
      {panelOpen ? (
        <ErrorBoundary>
          <TreePanel />
        </ErrorBoundary>
      ) : null}
    </>
  );
}
