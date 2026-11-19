import { Component, inject, signal } from '@angular/core';
import { BooksService } from '../service/books';
import { Book, BookDTO } from './model/books.model';

@Component({
  selector: 'app-books',
  standalone: true,
  templateUrl: './books.html',
})
export class BooksComponent {

  private _BooksService = inject(BooksService);

  books = signal<Book[]>([]);

  constructor() {
    this.getBooks();
  }

  getBooks() {
    this._BooksService.getBooks().subscribe({
      next: (data) => {
        this.books.set(data);
      },
      error: (error) => {
        console.error('Error al obtener libros:', error);
      }
    });
  }

  createBook() {

    const payload: BookDTO = {
      title: 'Libro de prueba',
      isbn: '9780000000001',
      authorId: '000000000000000000000000'
    };

    this._BooksService.createBook(payload).subscribe({
      next: (data) => {
        console.log(data);
        this.getBooks();
      },
      error: (error) => {
        console.error('Error al crear libro:', error);
      }
    });

  }
}