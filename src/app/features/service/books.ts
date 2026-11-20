import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Book, BookDTO, PaginatedResponse } from '../book/model/books.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BooksService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/books`;

  // Solicita libros paginados y permite filtrar por disponibilidad.
  getBooks(page = 1, limit = 100, available?: boolean): Observable<PaginatedResponse<Book>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (available !== undefined) {
      params = params.set('available', available);
    }
    return this.http.get<PaginatedResponse<Book>>(this.url, { params });
  }

  // Envía el formulario para crear un libro relacionado con un autor válido.
  createBook(dataBook: BookDTO): Observable<Book> {
    return this.http.post<Book>(this.url, dataBook);
  }

  // Actualiza los campos editables de un libro existente.
  updateBook(id: string, dataBook: Partial<BookDTO>): Observable<Book> {
    return this.http.put<Book>(`${this.url}/${id}`, dataBook);
  }

  // Elimina un libro; la API rechaza la operación si tiene préstamos activos.
  deleteBook(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}