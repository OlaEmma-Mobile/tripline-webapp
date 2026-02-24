declare module 'firebase-admin' {
  interface FirebaseApp {}

  interface DatabaseRef {
    set(value: unknown): Promise<void>;
    get(): Promise<{ exists(): boolean }>;
    child(path: string): DatabaseRef;
  }

  interface DatabaseService {
    ref(path: string): DatabaseRef;
  }

  interface MessagingService {
    send(message: {
      token: string;
      notification?: { title?: string; body?: string };
      data?: Record<string, string>;
    }): Promise<string>;
  }

  interface AdminModule {
    apps: FirebaseApp[];
    app(): FirebaseApp;
    initializeApp(config: unknown): FirebaseApp;
    credential: {
      cert(value: unknown): unknown;
    };
    database(app?: FirebaseApp): DatabaseService;
    messaging(app?: FirebaseApp): MessagingService;
  }

  const admin: AdminModule;
  export default admin;
}
