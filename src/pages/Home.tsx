import {
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

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  const [url, setUrl] = useState<Book[]>([]);
  const [token, setToken] = useState<Book[]>([]);

  const modal = useRef<HTMLIonModalElement>(null);
  const input = useRef<HTMLIonInputElement>(null);
  const input2 = useRef<HTMLIonInputElement>(null);

  useEffect(() => {
    const store = new Storage();
    fetch("http://localhost:3000/books")
      .then((response) => response.json())
      .then((data) => {
        store.create().then(() => {
          if (data) {
            data.shift();
            store.set("books", data);
            setBooks(data);
            setFilteredBooks(data);
          }
        });
      })
      .catch((e) => {
        store.create().then(() => {
          store.get("books").then((value: Book[]) => {
            if (value) {
              setBooks(value);
              setFilteredBooks(value);
            }
          });
        });
      });
  }, [setBooks, setFilteredBooks]);

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
      const { url, token } = ev.detail.data;
      setUrl(url);
      setToken(token);
    }
  }

  return (
    <IonPage>
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
                    />
                  </IonItem>
                  <IonItem>
                    <IonInput
                      label="Enter the access token"
                      labelPlacement="stacked"
                      ref={input2}
                      type="text"
                      placeholder="tokem"
                    />
                  </IonItem>
                </IonContent>
              </IonModal>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonHeader>
      <IonContent fullscreen>
        <div id="container">
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
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
