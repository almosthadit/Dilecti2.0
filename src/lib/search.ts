export async function searchAuthors(query: string) {
  if (!query.trim()) return [];
  try {
    const fetchOpts = { signal: AbortSignal.timeout(4000) };
    const res = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(query)}&limit=5`, fetchOpts);
    const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
    return (data.docs || []).map((doc: any) => ({
      id: doc.key,
      label: doc.name
    }));
  } catch (e) {
    console.error("Author search failed:", e);
    return [];
  }
}

export async function searchBooksForAutocomplete(query: string) {
  const books = await searchBooks(query);
  return books.map((b: any) => ({
    id: b.key,
    label: `${b.title} ${b.author_name ? `by ${b.author_name.join(', ')}` : ''}`.trim()
  }));
}

export async function searchBooks(query: string) {

  if (!query.trim()) return [];

  let currentQuery = query.trim();
  
  // Create a fuzzy query by adding wildcards to the words and replacing spaces
  const fuzzyQuery = currentQuery.split(" ").map(w => w + "*").join(" ");

  try {
    const fetchOpts = { signal: AbortSignal.timeout(4000) };
    
    // 1. Fetch from Google Books 
    const standardRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(fuzzyQuery)}&maxResults=8`, fetchOpts)
      .then(r => {
        if (!r.ok) throw new Error("Google Books failed");
        return r.json();
      })
      .catch(err => null);

    let allDocs: any[] = [];
    const seenTitles = new Set<string>();

    const processGoogleData = (data: any) => {
      if (data && data.items) {
        for (const item of data.items) {
          const title = item.volumeInfo.title;
          if (seenTitles.has(title.toLowerCase())) continue;
          seenTitles.add(title.toLowerCase());

          let coverUrl = item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null;
          if (coverUrl) {
            coverUrl = coverUrl.replace(/&zoom=[0-9]/g, '').replace(/&edge=curl/g, '');
          }

          allDocs.push({
            key: item.id,
            title: item.volumeInfo.title,
            author_name: item.volumeInfo.authors || ["Unknown Author"],
            coverUrl,
            description: item.volumeInfo.description || "",
            first_publish_year: item.volumeInfo.publishedDate ? item.volumeInfo.publishedDate.substring(0, 4) : null,
            subject: item.volumeInfo.categories || [],
            isbn: item.volumeInfo.industryIdentifiers?.map((id: any) => id.identifier) || [],
            pageCount: item.volumeInfo.pageCount
          });
        }
      }
    };

    if (standardRes) processGoogleData(standardRes);

    // 2. Fallback to OpenLibrary if no or few results
    if (allDocs.length === 0) {
      try {
        const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(fuzzyQuery)}&limit=8`, fetchOpts);
        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
        const olDocs = (data.docs || []).map((item: any) => ({
          key: item.key,
          title: item.title,
          author_name: item.author_name || ["Unknown Author"],
          coverUrl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
          first_publish_year: item.first_publish_year,
          subject: item.subject || [],
          isbn: item.isbn || [],
          pageCount: undefined
        }));

        olDocs.forEach((olDoc: any) => {
          if (!seenTitles.has(olDoc.title.toLowerCase())) {
            seenTitles.add(olDoc.title.toLowerCase());
            allDocs.push(olDoc);
          }
        });
      } catch (error) {
        console.error("OpenLibrary search fallback failed:", error);
      }
    }

    return allDocs.slice(0, 8);
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
}
