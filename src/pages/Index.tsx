import { AuthGuard } from '@/components/AuthGuard';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { AppLayout } from '@/components/AppLayout';

const Index = () => {
  return (
    <AuthGuard>
      {(user) => (
        <ProjectProvider userId={user.id}>
          <AppLayout user={user} />
        </ProjectProvider>
      )}
    </AuthGuard>
  );
};

export default Index;
