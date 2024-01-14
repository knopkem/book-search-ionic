import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonPage,
  IonRow,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import "./Home.css";
import { useState, useEffect, HtmlHTMLAttributes, useRef } from "react";
import { Book } from "../book";
import { Storage } from "@ionic/storage";
import { IonIcon } from "@ionic/react";
import { settings } from "ionicons/icons";
import { OverlayEventDetail } from "@ionic/react/dist/types/components/react-component-lib/interfaces";
import { App } from "@capacitor/app";

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  const [cloud, setCloud] = useState({
    url: "http://localhost:3000",
    token: "12345",
  });
  const [syncMessage, setSyncMessage] = useState("");

  const [showBackAlert, setShowBackAlert] = useState(false);

  document.addEventListener("ionBackButton", (ev: any) => {
    ev.detail.register(-1, () => {
      setShowBackAlert(true);
    });
  });

  const modal = useRef<HTMLIonModalElement>(null);
  const input = useRef<HTMLIonInputElement>(null);
  const input2 = useRef<HTMLIonInputElement>(null);
  const store = new Storage();

  useEffect(() => {
    console.log("fetching cloud credentials from local storage");
    store.create().then(() => {
      store.get("cloud").then((value) => {
        if (!value) return;
        setCloud(value);
      });
      store.get("sync").then((value) => {
        setSyncMessage(`last synchronization: ${value}`);
      });
    });
  }, []);

  useEffect(() => {
    const { url, token } = cloud;
    if (!url || !token) return;
    console.log("fetching books from:", url);
    fetch(url + "/books", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          setBooks(data);
          setFilteredBooks(data);
          store.create().then(() => {
            data.shift();
            store.set("books", data);
            store.set("sync", new Date().toLocaleDateString("de-DE"));
          });
        }
      })
      .catch((e) => {
        console.log("fetching books from local storage");
        store.create().then(() => {
          store.get("books").then((value: Book[]) => {
            if (value) {
              setBooks(value);
              setFilteredBooks(value);
            }
          });
        });
      });
  }, [setBooks, setFilteredBooks, cloud, setSyncMessage]);

  const handleInput = (ev: Event) => {
    let query = "";
    const target = ev.target as HTMLIonSearchbarElement;
    if (target) query = target.value!.toLowerCase();
    const updatedBooks = books.filter(
      (d) =>
        d.description.toLowerCase().includes(query) ||
        d.name.toLowerCase().includes(query)
    );
    setFilteredBooks(updatedBooks);
  };

  function confirm() {
    modal.current?.dismiss(
      { url: input.current?.value, token: input2.current?.value },
      "confirm"
    );
  }

  function onWillDismiss(ev: CustomEvent<OverlayEventDetail>) {
    if (ev.detail.role === "confirm") {
      const store = new Storage();
      store.create().then(() => {
        store.set("cloud", ev.detail.data);
        setCloud(ev.detail.data);
      });
    }
  }

  return (
    <IonPage>
      <IonAlert
        isOpen={showBackAlert}
        header={"Please Confirm!"}
        message={"Do you want to exit the app?"}
        buttons={[
          {
            text: "No",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {},
          },
          {
            text: "Yes",
            handler: () => {
              App.exitApp();
            },
          },
        ]}
        onDidDismiss={() => setShowBackAlert(false)}
      />
      <IonHeader>
        <IonGrid>
          <IonRow>
            <IonCol>
              <IonToolbar>
                <IonSearchbar
                  show-clear-button="focus"
                  onIonInput={(ev) => handleInput(ev)}
                ></IonSearchbar>
              </IonToolbar>
            </IonCol>
            <IonCol size="auto">
              <IonButton fill="clear" id="open-modal" expand="block">
                <IonIcon icon={settings} size="large" color="primary"></IonIcon>
              </IonButton>
              <IonModal
                ref={modal}
                trigger="open-modal"
                onWillDismiss={(ev) => onWillDismiss(ev)}
              >
                <IonHeader>
                  <IonToolbar>
                    <IonButtons slot="start">
                      <IonButton onClick={() => modal.current?.dismiss()}>
                        Cancel
                      </IonButton>
                    </IonButtons>
                    <IonTitle>Settings</IonTitle>
                    <IonButtons slot="end">
                      <IonButton strong={true} onClick={() => confirm()}>
                        Confirm
                      </IonButton>
                    </IonButtons>
                  </IonToolbar>
                </IonHeader>
                <IonContent className="ion-padding">
                  <IonItem>
                    <IonInput
                      label="Enter the url to cloud server"
                      labelPlacement="stacked"
                      ref={input}
                      type="text"
                      placeholder="Cloud URL"
                      value={cloud.url}
                    />
                  </IonItem>
                  <IonItem>
                    <IonInput
                      label="Enter the access token"
                      labelPlacement="stacked"
                      ref={input2}
                      type="text"
                      placeholder="token"
                      value={cloud.token}
                    />
                  </IonItem>
                  <IonItem>
                    <IonText>{syncMessage}</IonText>
                  </IonItem>
                </IonContent>
              </IonModal>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonHeader>
      <IonContent fullscreen={false}>
          <IonList>
            {filteredBooks.map((b, i) => (
              <IonCard key={i}>
                <IonCardHeader>
                  <IonCardTitle>{b.name}</IonCardTitle>
                  <IonCardSubtitle>{b.description}</IonCardSubtitle>
                </IonCardHeader>

                <IonCardContent>{b.remarks}</IonCardContent>
              </IonCard>
            ))}
          </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
