import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonModal,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Storage } from '@ionic/storage';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { App } from '@capacitor/app';
import { settings } from 'ionicons/icons';

import { Book } from '../book';

type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

type AuthSession = {
  rawToken: string;
  user: AuthenticatedUser;
  deviceName: string;
};

type GoogleAuthConfig = {
  clientId: string;
  enabled: boolean;
};

type IonBackButtonEvent = CustomEvent<{
  register: (priority: number, handler: () => void) => void;
}>;

const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const STORAGE_KEYS = {
  authSession: 'auth-session',
  books: 'books',
  syncMessage: 'sync-message',
} as const;
const APP_VERSION = '9';

const Home: React.FC = () => {
  const store = useMemo(() => new Storage(), []);

  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBackAlert, setShowBackAlert] = useState(false);

  useEffect(() => {
    const handleBackButton = (event: Event) => {
      const backButtonEvent = event as IonBackButtonEvent;
      backButtonEvent.detail.register(-1, () => {
        setShowBackAlert(true);
      });
    };

    document.addEventListener('ionBackButton', handleBackButton);

    return () => {
      document.removeEventListener('ionBackButton', handleBackButton);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initialize = async () => {
      await store.create();

      const [storedSession, storedBooks, storedSyncMessage] = await Promise.all([
        store.get(STORAGE_KEYS.authSession) as Promise<AuthSession | null>,
        store.get(STORAGE_KEYS.books) as Promise<Book[] | null>,
        store.get(STORAGE_KEYS.syncMessage) as Promise<string | null>,
      ]);

      if (isCancelled) {
        return;
      }

      if (storedSession) {
        setAuthSession(storedSession);
      }

      if (storedBooks) {
        const nextBooks = normalizeBooks(storedBooks);
        setBooks(nextBooks);
      }

      if (storedSyncMessage) {
        setSyncMessage(storedSyncMessage);
      }

      setIsInitializing(false);
    };

    void initialize();

    return () => {
      isCancelled = true;
    };
  }, [store]);

  useEffect(() => {
    setFilteredBooks(filterBooks(books, searchQuery));
  }, [books, searchQuery]);

  const handleSearchInput = (event: Event) => {
    const target = event.target as HTMLIonSearchbarElement;
    setSearchQuery((target.value ?? '').toLowerCase());
  };

  const presentToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastOpen(true);
  }, []);

  const applyBooks = useCallback((nextBooks: Book[]) => {
    setBooks(nextBooks);
  }, []);

  const persistBooks = useCallback(async (nextBooks: Book[], nextSyncMessage: string) => {
    await Promise.all([
      store.set(STORAGE_KEYS.books, nextBooks),
      store.set(STORAGE_KEYS.syncMessage, nextSyncMessage),
    ]);
    applyBooks(nextBooks);
    setSyncMessage(nextSyncMessage);
  }, [applyBooks, store]);

  const clearStoredSession = useCallback(async (options: { clearBooks: boolean }) => {
    await store.remove(STORAGE_KEYS.authSession);

    if (options.clearBooks) {
      await Promise.all([
        store.remove(STORAGE_KEYS.books),
        store.remove(STORAGE_KEYS.syncMessage),
      ]);
      applyBooks([]);
      setSyncMessage('');
      setSearchQuery('');
    }

    setAuthSession(null);
  }, [applyBooks, store]);

  const syncBooks = useCallback(async (
    rawToken: string,
    options: {
      showSuccessToast: boolean;
    },
  ) => {
    setIsSyncing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/books`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rawToken}`,
        },
      });

      if (response.status === 401) {
        await clearStoredSession({ clearBooks: false });
        throw new Error('Your mobile session expired. Please sign in again.');
      }

      if (!response.ok) {
        throw new Error(`Synchronization failed (${response.status}).`);
      }

      const data = (await response.json()) as Book[];
      const nextBooks = normalizeBooks(data);
      const nextSyncMessage = `last synchronization: ${new Date().toLocaleDateString('de-DE')}`;

      await persistBooks(nextBooks, nextSyncMessage);

      if (options.showSuccessToast) {
        presentToast('Books synchronized successfully.');
      }
    } catch (error) {
      const cachedBooks = (await store.get(STORAGE_KEYS.books)) as Book[] | null;

      if (cachedBooks) {
        applyBooks(normalizeBooks(cachedBooks));
      }

      presentToast(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }, [applyBooks, clearStoredSession, persistBooks, presentToast, store]);

  useEffect(() => {
    if (isInitializing || !authSession) {
      return;
    }

    void syncBooks(authSession.rawToken, { showSuccessToast: false });
  }, [authSession, isInitializing, syncBooks]);

  const signIn = async () => {
    if (!Capacitor.isNativePlatform()) {
      presentToast('Google sign-in is only available in the native Android app.');
      return;
    }

    setIsSigningIn(true);

    try {
      const configResponse = await fetch(`${API_BASE_URL}/api/auth/google/config`);

      if (!configResponse.ok) {
        throw new Error(`Unable to load Google sign-in configuration (${configResponse.status}).`);
      }

      const googleConfig = (await configResponse.json()) as GoogleAuthConfig;

      if (!googleConfig.enabled || !googleConfig.clientId) {
        throw new Error('Google sign-in is not configured on the server.');
      }

      await GoogleSignIn.initialize({
        clientId: googleConfig.clientId,
      });

      const googleResult = await GoogleSignIn.signIn();

      if (!googleResult.idToken) {
        throw new Error('Google sign-in did not return an ID token.');
      }

      const deviceName = getDeviceName();
      const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: googleResult.idToken,
          deviceName,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const nextSession = {
        ...(await response.json() as Omit<AuthSession, 'deviceName'>),
        deviceName,
      };

      await store.set(STORAGE_KEYS.authSession, nextSession);
      setAuthSession(nextSession);
      setIsSettingsOpen(false);
      await syncBooks(nextSession.rawToken, { showSuccessToast: true });
    } catch (error) {
      presentToast(getErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    if (!authSession) {
      return;
    }

    setIsSigningOut(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/mobile/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authSession.rawToken}`,
        },
      });

      if (!response.ok && response.status !== 401) {
        throw new Error(await readErrorMessage(response));
      }

      await GoogleSignIn.signOut();
      await clearStoredSession({ clearBooks: true });
      setIsSettingsOpen(false);
      presentToast('Signed out successfully.');
    } catch (error) {
      presentToast(getErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <IonPage>
      <IonAlert
        isOpen={showBackAlert}
        header="Please Confirm!"
        message="Do you want to exit the app?"
        buttons={[
          {
            text: 'No',
            role: 'cancel',
            cssClass: 'secondary',
          },
          {
            text: 'Yes',
            handler: () => {
              App.exitApp();
            },
          },
        ]}
        onDidDismiss={() => setShowBackAlert(false)}
      />
      <IonHeader className="home-header">
        <IonToolbar className="home-toolbar">
          <div className="home-toolbar__content">
            <IonSearchbar
              className="home-searchbar"
              showClearButton="focus"
              value={searchQuery}
              onIonInput={handleSearchInput}
            />
            <IonButton className="home-settings-button" fill="clear" onClick={() => setIsSettingsOpen(true)}>
              <IonIcon icon={settings} size="large" color="primary" />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen={false}>
        <IonModal isOpen={isSettingsOpen} onDidDismiss={() => setIsSettingsOpen(false)}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setIsSettingsOpen(false)}>Close</IonButton>
              </IonButtons>
              <IonTitle>Settings</IonTitle>
              <IonButtons slot="end">
                {authSession ? (
                  <IonButton
                    strong
                    onClick={() => void syncBooks(authSession.rawToken, { showSuccessToast: true })}
                    disabled={isSyncing}
                  >
                    Sync now
                  </IonButton>
                ) : null}
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonText>
                <strong>Server:</strong> {API_BASE_URL}
              </IonText>
            </IonItem>
            <IonItem>
              <IonText>
                <strong>Status:</strong>{' '}
                {authSession ? `Signed in as ${authSession.user.displayName}` : 'Not signed in'}
              </IonText>
            </IonItem>
            {authSession ? (
              <>
                <IonItem>
                  <IonText>
                    <strong>Email:</strong> {authSession.user.email}
                  </IonText>
                </IonItem>
                <IonItem>
                  <IonText>
                    <strong>Device:</strong> {authSession.deviceName}
                  </IonText>
                </IonItem>
              </>
            ) : null}
            <IonItem>
              <IonText>
                <strong>Last sync:</strong> {syncMessage || 'Not synchronized yet'}
              </IonText>
            </IonItem>
            <IonItem>
              <IonText>
                <strong>Books:</strong> {books.length}
              </IonText>
            </IonItem>
            <IonItem>
              <IonText>
                <strong>Version:</strong> V{APP_VERSION}
              </IonText>
            </IonItem>
            <div className="ion-padding-top">
              {authSession ? (
                <IonButton expand="block" color="medium" onClick={() => void signOut()} disabled={isSigningOut}>
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </IonButton>
              ) : (
                <IonButton expand="block" onClick={() => void signIn()} disabled={isSigningIn}>
                  {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                </IonButton>
              )}
            </div>
          </IonContent>
        </IonModal>

        {!authSession && !books.length && !isInitializing ? (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Sign in to synchronize your books</IonCardTitle>
              <IonCardSubtitle>Offline books appear here after the first successful sync.</IonCardSubtitle>
            </IonCardHeader>
          </IonCard>
        ) : null}

        <IonList>
          {filteredBooks.map((book) => (
            <IonCard key={`${book.name}-${book.description}-${book.remarks}`}>
              <IonCardHeader>
                <IonCardTitle>{book.name}</IonCardTitle>
                <IonCardSubtitle>{book.description}</IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>{book.remarks}</IonCardContent>
            </IonCard>
          ))}
        </IonList>
        <IonToast
          isOpen={isToastOpen}
          onDidDismiss={() => setIsToastOpen(false)}
          message={toastMessage}
          duration={5000}
        />
      </IonContent>
    </IonPage>
  );
};

function normalizeBooks(books: Book[]) {
  return [...books]
    .filter((book) => book.name.trim() !== '')
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
}

function filterBooks(books: Book[], query: string) {
  if (!query) {
    return books;
  }

  return books.filter((book) => {
    const value = query.toLowerCase();
    return (
      book.name.toLowerCase().includes(value) ||
      book.description.toLowerCase().includes(value) ||
      book.remarks.toLowerCase().includes(value)
    );
  });
}

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? `Request failed (${response.status}).`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function getDeviceName() {
  switch (Capacitor.getPlatform()) {
    case 'android':
      return 'Android app';
    case 'ios':
      return 'iOS app';
    default:
      return 'Mobile app';
  }
}

function resolveApiBaseUrl(configuredBaseUrl?: string) {
  const trimmedBaseUrl = configuredBaseUrl?.trim();

  if (!trimmedBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  if (!Capacitor.isNativePlatform() || !URL.canParse(trimmedBaseUrl)) {
    return trimTrailingSlash(trimmedBaseUrl);
  }

  const baseUrl = new URL(trimmedBaseUrl);
  const isLocalAddress = ['localhost', '127.0.0.1', '10.0.2.2'].includes(baseUrl.hostname);

  if (baseUrl.protocol === 'http:' && !isLocalAddress) {
    baseUrl.protocol = 'https:';
  }

  return trimTrailingSlash(baseUrl.toString());
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export default Home;
