import { NextRequest, NextResponse } from "next/server";

// Get API key from environment variable
const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY || "";
const COMIC_VINE_BASE_URL = "https://comicvine.gamespot.com/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  if (!id) {
    return NextResponse.json(
      { error: "Comic ID parameter is required" },
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
    // Create URL for Comic Vine API to get volume details
    const apiUrl = new URL(`${COMIC_VINE_BASE_URL}/volume/4050-${id}`);
    apiUrl.searchParams.append("api_key", COMIC_VINE_API_KEY);
    apiUrl.searchParams.append("format", "json");
    apiUrl.searchParams.append("field_list", "id,name,image,description,publisher,start_year,characters,count_of_issues,deck");
    
    console.log(`Fetching Comic Vine details for volume ID: ${id}`);
    
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
    
    if (data.error === "OK" && data.results) {
      const comic = data.results;
      
      // Process characters - Comic Vine API doesn't provide full character data in the volume endpoint
      // We'll need to fetch character details if we want complete information
      let characters = [];
      
      if (comic.characters && Array.isArray(comic.characters)) {
        // If characters exist, extract their basic info
        characters = comic.characters.slice(0, 10).map((character: any) => {
          return {
            id: character.id,
            name: character.name || "Unknown Character",
            role: "Character",
            image: character.image?.original_url || null,
            imageUrls: {
              original: character.image?.original_url || null,
              medium: character.image?.medium_url || null,
              screen: character.image?.screen_url || null, 
              small: character.image?.small_url || null
            },
            aliases: character.aliases || "",
            gender: character.gender || "Unknown",
            realName: character.real_name || ""
          };
        });
        
        // For characters with missing images, we could fetch additional details
        // But this would require multiple API calls, which might hit rate limits
        console.log(`Processed ${characters.length} characters for comic ID: ${id}`);
      }
      
      // Map the Comic Vine response to our expected format
      const result = {
        id: comic.id,
        name: comic.name || "Unknown Title",
        image: {
          original_url: comic.image?.original_url || null,
          medium_url: comic.image?.medium_url || null,
          screen_url: comic.image?.screen_url || null,
          small_url: comic.image?.small_url || null
        },
        description: comic.description || comic.deck || "No description available",
        start_year: comic.start_year || null,
        publisher: comic.publisher?.name || "Unknown Publisher",
        issue_count: comic.count_of_issues || 0,
        characters: characters
      };
      
      return NextResponse.json(result);
    } else {
      console.error("Comic Vine API returned an error:", data.error);
      throw new Error(`Comic Vine API returned an error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error fetching comic details from Comic Vine API:", error);
    
    // Only use mock data if explicitly in development mode with flag
    if (process.env.NODE_ENV === "development" && process.env.USE_MOCK_DATA === "true") {
      console.log("Using mock data for development");
      return NextResponse.json(getMockComicData(id));
    }
    
    return NextResponse.json(
      { error: "Failed to fetch comic details", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Mock data for development/testing only
function getMockComicData(id: string) {
  const mockComics = {
    "2": {
      id: 2,
      name: "Spider-Man",
      image: {
        original_url: "https://comicvine.gamespot.com/a/uploads/original/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg",
        medium_url: "https://comicvine.gamespot.com/a/uploads/scale_medium/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg",
        screen_url: "https://comicvine.gamespot.com/a/uploads/screen_medium/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg",
        small_url: "https://comicvine.gamespot.com/a/uploads/scale_small/12/124259/8126579-amazing_spider-man_vol_5_54_stormbreakers_variant.jpg"
      },
      description: "With great power comes great responsibility. Spider-Man is a superhero created by writer Stan Lee and artist Steve Ditko.",
      start_year: "1962",
      publisher: "Marvel Comics",
      issue_count: 185,
      characters: [
        {
          id: 1,
          name: "Peter Parker",
          role: "Main Character",
          image: "https://comicvine.gamespot.com/a/uploads/scale_medium/3/31599/2125797-spiderman.jpg",
          imageUrls: {
            original: "https://comicvine.gamespot.com/a/uploads/original/3/31599/2125797-spiderman.jpg",
            medium: "https://comicvine.gamespot.com/a/uploads/scale_medium/3/31599/2125797-spiderman.jpg",
            screen: "https://comicvine.gamespot.com/a/uploads/screen_medium/3/31599/2125797-spiderman.jpg",
            small: "https://comicvine.gamespot.com/a/uploads/scale_small/3/31599/2125797-spiderman.jpg"
          },
          aliases: "Spider-Man, Spidey, Web-Slinger",
          gender: "Male",
          realName: "Peter Benjamin Parker"
        },
        {
          id: 2,
          name: "Mary Jane Watson",
          role: "Supporting Character",
          image: "https://comicvine.gamespot.com/a/uploads/scale_medium/1/14487/8021124-mary_jane_watson.jpg",
          imageUrls: {
            original: "https://comicvine.gamespot.com/a/uploads/original/1/14487/8021124-mary_jane_watson.jpg",
            medium: "https://comicvine.gamespot.com/a/uploads/scale_medium/1/14487/8021124-mary_jane_watson.jpg",
            screen: "https://comicvine.gamespot.com/a/uploads/screen_medium/1/14487/8021124-mary_jane_watson.jpg",
            small: "https://comicvine.gamespot.com/a/uploads/scale_small/1/14487/8021124-mary_jane_watson.jpg"
          },
          aliases: "MJ, Red",
          gender: "Female",
          realName: "Mary Jane Watson"
        },
        {
          id: 3,
          name: "Green Goblin",
          role: "Villain",
          image: "https://comicvine.gamespot.com/a/uploads/scale_medium/5/57845/1759739-green_goblin.jpg",
          imageUrls: {
            original: "https://comicvine.gamespot.com/a/uploads/original/5/57845/1759739-green_goblin.jpg",
            medium: "https://comicvine.gamespot.com/a/uploads/scale_medium/5/57845/1759739-green_goblin.jpg",
            screen: "https://comicvine.gamespot.com/a/uploads/screen_medium/5/57845/1759739-green_goblin.jpg",
            small: "https://comicvine.gamespot.com/a/uploads/scale_small/5/57845/1759739-green_goblin.jpg"
          },
          aliases: "Norman Osborn, The Goblin",
          gender: "Male",
          realName: "Norman Osborn"
        }
      ]
    },
    "1": {
      id: 1,
      name: "Batman",
      image: {
        original_url: "https://comicvine.gamespot.com/a/uploads/original/5/56044/2467401-batman_bruce_wayne.jpeg",
        medium_url: "https://comicvine.gamespot.com/a/uploads/scale_medium/5/56044/2467401-batman_bruce_wayne.jpeg",
        screen_url: "https://comicvine.gamespot.com/a/uploads/screen_medium/5/56044/2467401-batman_bruce_wayne.jpeg",
        small_url: "https://comicvine.gamespot.com/a/uploads/scale_small/5/56044/2467401-batman_bruce_wayne.jpeg"
      },
      description: "The Dark Knight of Gotham City. Batman is a superhero created by artist Bob Kane and writer Bill Finger.",
      start_year: "1939",
      publisher: "DC Comics",
      issue_count: 126,
      characters: [
        {
          id: 4,
          name: "Bruce Wayne",
          role: "Main Character",
          image: "https://comicvine.gamespot.com/a/uploads/scale_medium/12/124259/7776663-ezgif-7-32f7d5e7d233.jpg",
          imageUrls: {
            original: "https://comicvine.gamespot.com/a/uploads/original/12/124259/7776663-ezgif-7-32f7d5e7d233.jpg",
            medium: "https://comicvine.gamespot.com/a/uploads/scale_medium/12/124259/7776663-ezgif-7-32f7d5e7d233.jpg",
            screen: "https://comicvine.gamespot.com/a/uploads/screen_medium/12/124259/7776663-ezgif-7-32f7d5e7d233.jpg",
            small: "https://comicvine.gamespot.com/a/uploads/scale_small/12/124259/7776663-ezgif-7-32f7d5e7d233.jpg"
          },
          aliases: "Batman, The Dark Knight, The Caped Crusader",
          gender: "Male",
          realName: "Bruce Wayne"
        },
        {
          id: 5,
          name: "Joker",
          role: "Villain",
          image: "https://comicvine.gamespot.com/a/uploads/scale_medium/12/124259/7952283-joker-nicholson.jpeg",
          imageUrls: {
            original: "https://comicvine.gamespot.com/a/uploads/original/12/124259/7952283-joker-nicholson.jpeg",
            medium: "https://comicvine.gamespot.com/a/uploads/scale_medium/12/124259/7952283-joker-nicholson.jpeg",
            screen: "https://comicvine.gamespot.com/a/uploads/screen_medium/12/124259/7952283-joker-nicholson.jpeg",
            small: "https://comicvine.gamespot.com/a/uploads/scale_small/12/124259/7952283-joker-nicholson.jpeg"
          },
          aliases: "The Clown Prince of Crime",
          gender: "Male",
          realName: "Unknown"
        }
      ]
    }
  };
  
  // Return mock data for the requested ID, or a 404 error if not found
  return mockComics[id as keyof typeof mockComics] || {
    error: "Comic not found",
    status: 404,
  };
} 