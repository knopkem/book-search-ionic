import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonList, IonPage, IonSearchbar, IonToolbar } from '@ionic/react';
import './Home.css';
import { useState, useEffect } from 'react';
import { Book } from '../book';
import { Storage } from '@ionic/storage';

const Home: React.FC = () =>  
{
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  useEffect(() => {
    console.log('refresh');
    const store = new Storage();
    store.create().then(() => {
      store.get("books").then((value: Book[]) => {
        setBooks(value);
        setFilteredBooks(value);
      });
    });
  }, [setBooks, setFilteredBooks]);

  const handleInput = (ev: Event) => {
    let query = '';
    const target = ev.target as HTMLIonSearchbarElement;
    if (target) query = target.value!.toLowerCase();
    const updatedBooks = books.filter((d) => (d.author.toLowerCase().includes(query)) || (d.title.toLowerCase().includes(query)));
    console.log(updatedBooks.length)
    setFilteredBooks(updatedBooks);

  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonSearchbar show-clear-button="focus" onIonInput={(ev) => handleInput(ev)}></IonSearchbar>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
      <IonList>
        {filteredBooks.map((b) => (
          <IonCard>
          <IonCardHeader>
            <IonCardTitle>{b.title}</IonCardTitle>
            <IonCardSubtitle>{b.author}</IonCardSubtitle>
          </IonCardHeader>

          <IonCardContent>
            {b.description}
          </IonCardContent>
        </IonCard>
        ))}
      </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
