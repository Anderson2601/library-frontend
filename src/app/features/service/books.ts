import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Book, BookDTO } from '../book/model/books.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BooksService {

  private postman = inject(HttpClient);

  private url = `${environment.apiUrl}/books`;

  getBooks(): Observable<Book[]> {
    return this.postman.get<Book[]>(this.url);
  }

  createBook(dataBook: BookDTO): Observable<Book> {
    return this.postman.post<Book>(this.url, dataBook);
  }
}