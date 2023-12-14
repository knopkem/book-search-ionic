import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonList,
  IonPage,
  IonRow,
  IonSearchbar,
  IonToolbar,
} from "@ionic/react";
import "./Home.css";
import { useState, useEffect, HtmlHTMLAttributes } from "react";
import { Book } from "../book";
import { Storage } from "@ionic/storage";
import { IonIcon } from "@ionic/react";
import { settings } from "ionicons/icons";

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

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
    console.log(updatedBooks.length);
    setFilteredBooks(updatedBooks);
  };

  const onClick = (ev: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    console.log(ev);
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
              <IonButton onClick={(ev) => onClick(ev)} fill="clear">
              <IonIcon icon={settings} size="large" color="primary"></IonIcon>
              </IonButton>
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
