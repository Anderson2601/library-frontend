import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { Book, BookDTO, PaginatedResponse } from '../book/model/books.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BooksService {

  private postman = inject(HttpClient);

  private url = `${environment.apiUrl}/books`;

  getBooks(): Observable<Book[]> {
    return this.postman
      .get<PaginatedResponse<Book>>(this.url)
      .pipe(map((response) => response.data));
  }

  createBook(dataBook: BookDTO): Observable<Book> {
    return this.postman.post<Book>(this.url, dataBook);
  }
}