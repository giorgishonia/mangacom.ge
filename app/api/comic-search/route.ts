import { NextRequest, NextResponse } from "next/server";

// Get API key from environment variable
const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY || "";
const COMIC_VINE_BASE_URL = "https://comicvine.gamespot.com/api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  
  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }
  
  if (!COMIC_VINE_API_KEY) {
    return NextResponse.json(
      { error: "Comic Vine API key is not configured. Please set the COMIC_VINE_API_KEY environment variable." },
      { status: 500 }
    );
  }
  
  try {
    // Create URL for Comic Vine API - we're searching for volumes (comic series)
    const apiUrl = new URL(`${COMIC_VINE_BASE_URL}/search`);
    apiUrl.searchParams.append("api_key", COMIC_VINE_API_KEY);
    apiUrl.searchParams.append("format", "json");
    apiUrl.searchParams.append("query", query);
    apiUrl.searchParams.append("resources", "volume"); // Limit to comic volumes
    apiUrl.searchParams.append("field_list", "id,name,image,description,start_year,publisher,volume_count,count_of_issues,deck");
    
    console.log(`Searching Comic Vine for: "${query}"`);
    
    // Fetch data from Comic Vine API
    const response = await fetch(apiUrl.toString(), {
      headers: {
        "User-Agent": "MangAnime Comics Search/1.0",
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Comic Vine API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Comic Vine API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error === "OK") {
      // Process the results to enhance with additional info and better image URLs
      const enhancedResults = (data.results || []).map((comic: any) => {
        // Ensure we have all required properties
        return {
          id: comic.id,
          name: comic.name || "Unknown Title",
          image: {
            original_url: comic.image?.original_url || null,
            medium_url: comic.image?.medium_url || null,
            screen_url: comic.image?.screen_url || null,
            small_url: comic.image?.small_url || null
          },
          description: comic.description || comic.deck || "No description available",
          start_year: comic.start_year || comic.year || null,
          publisher: comic.publisher || { name: "Unknown Publisher" },
          volume_count: comic.volume_count || 0,
          issue_count: comic.count_of_issues || 0
        };
      });
      
      console.log(`Found ${enhancedResults.length} comics matching query: "${query}"`);
      
      // Map the Comic Vine response to our expected format
      return NextResponse.json({
        results: enhancedResults,
        total: data.number_of_total_results || enhancedResults.length,
      });
    } else {
      console.error("Comic Vine API returned an error:", data.error);
      throw new Error(`Comic Vine API returned an error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error fetching from Comic Vine API:", error);
    
    // Only use mock data if explicitly in development mode with flag
    if (process.env.NODE_ENV === "development" && process.env.USE_MOCK_DATA === "true") {
      console.log("Using mock data for development");
      return NextResponse.json({
        results: getMockComicData(query),
        total: 5,
      });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch comics data", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Mock data for development/testing only
function getMockComicData(query: string) {
  const lowerQuery = query.toLowerCase();
  
  const mockComics = [
    {
      id: 1,
      name: "Batman",
      image: {
        original_url: "https://comicvine.gamespot.com/a/uploads/scale_large/5/56044/2467401-batman_bruce_wayne.jpeg",
        medium_url: "https://comicvine.gamespot.com/a/uploads/scale_medium/5/56044/2467401-batman_bruce_wayne.jpeg",
        screen_url: "https://comicvine.gamespot.com/a/uploads/screen_medium/5/56044/2467401-batman_bruce_wayne.jpeg",
        small_url: "https://comicvine.gamespot.com/a/uploads/scale_small/5/56044/2467401-batman_bruce_wayne.jpeg"
      },
      description: "The Dark Knight of Gotham City. Batman is a superhero created by artist Bob Kane and writer Bill Finger.",
      start_year: "1939",
      publisher: { name: "DC Comics" },
      volume_count: 12,
      issue_count: 126
    },
    {
      id: 2,
      name: "Spider-Man",
      image: {
        original_url: "https://comicvine.gamespot.com/a/uploads/scale_large/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg",
        medium_url: "https://comicvine.gamespot.com/a/uploads/scale_medium/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg",
        screen_url: "https://comicvine.gamespot.com/a/uploads/screen_medium/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg",
        small_url: "https://comicvine.gamespot.com/a/uploads/scale_small/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg"
      },
      description: "With great power comes great responsibility. Spider-Man is a superhero created by writer Stan Lee and artist Steve Ditko.",
      start_year: "1962",
      publisher: { name: "Marvel Comics" },
      volume_count: 15,
      issue_count: 185
    },
    {
      id: 3,
      name: "Superman",
      image: {
        original_url: "https://comicvine.gamespot.com/a/uploads/scale_large/11112/111120209/7243960-superman%20-%20heroes%20%282020%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg",
        medium_url: "https://comicvine.gamespot.com/a/uploads/scale_medium/11112/111120209/7243960-superman%20-%20heroes%20%282020%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg",
        screen_url: "https://comicvine.gamespot.com/a/uploads/screen_medium/11112/111120209/7243960-superman%20-%20heroes%20%282020%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg",
        small_url: "https://comicvine.gamespot.com/a/uploads/scale_small/11112/111120209/7243960-superman%20-%20heroes%20%282020%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg"
      },
      description: "The Last Son of Krypton. Superman is a superhero created by writer Jerry Siegel and artist Joe Shuster.",
      start_year: "1938",
      publisher: { name: "DC Comics" },
      volume_count: 14,
      issue_count: 150
    },
    {
      id: 4,
      name: "Wonder Woman",
      image: {
        original_url: "https://comicvine.gamespot.com/a/uploads/scale_large/11112/111120209/7868619-wonder%20woman%20-%20black%20and%20gold%20%282021%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg",
        medium_url: "https://comicvine.gamespot.com/a/uploads/scale_medium/11112/111120209/7868619-wonder%20woman%20-%20black%20and%20gold%20%282021%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg",
        screen_url: "https://comicvine.gamespot.com/a/uploads/screen_medium/11112/111120209/7868619-wonder%20woman%20-%20black%20and%20gold%20%282021%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg",
        small_url: "https://comicvine.gamespot.com/a/uploads/scale_small/11112/111120209/7868619-wonder%20woman%20-%20black%20and%20gold%20%282021%29%20%28digital%29%20%28son%20of%20ultron-empire%29%20001.jpg"
      },
      description: "Amazon warrior princess from Themyscira. Wonder Woman is a superhero created by psychologist William Moulton Marston.",
      start_year: "1941",
      publisher: { name: "DC Comics" },
      volume_count: 9,
      issue_count: 120
    },
    {
      id: 5,
      name: "X-Men",
      image: {
        original_url: "https://comicvine.gamespot.com/a/uploads/scale_large/5/54649/1464260-xmen1_cvr.jpg",
        medium_url: "https://comicvine.gamespot.com/a/uploads/scale_medium/5/54649/1464260-xmen1_cvr.jpg",
        screen_url: "https://comicvine.gamespot.com/a/uploads/screen_medium/5/54649/1464260-xmen1_cvr.jpg",
        small_url: "https://comicvine.gamespot.com/a/uploads/scale_small/5/54649/1464260-xmen1_cvr.jpg"
      },
      description: "A team of mutant superheroes, led by Professor Charles Xavier. The X-Men were created by writer Stan Lee and artist Jack Kirby.",
      start_year: "1963",
      publisher: { name: "Marvel Comics" },
      volume_count: 20,
      issue_count: 210
    }
  ];
  
  // Return filtered results based on query
  return mockComics.filter(comic => 
    comic.name.toLowerCase().includes(lowerQuery) || 
    comic.publisher.name.toLowerCase().includes(lowerQuery)
  );
} 