import { Routes } from '@angular/router';
import { BooksComponent } from './features/book/books';

export const routes: Routes = [
  { path: 'books', component: BooksComponent },
  { path: '', redirectTo: 'books', pathMatch: 'full' }
];
