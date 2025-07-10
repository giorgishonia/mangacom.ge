// AniList API client

const API_URL = 'https://graphql.anilist.co';

// Search AniList for manga
export async function searchAniList(query: string) {
  const mediaType = "MANGA";
  const gqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ${mediaType}) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            medium
            large
          }
          startDate {
            year
          }
          season
          seasonYear
          type
        }
      }
    }
  `;

  const variables = {
    search: query
  };

  const data = await fetchFromAniList(gqlQuery, variables);
  return data.Page.media;
}

// Fetch trending manga
export async function getTrendingManga(limit = 10) {
  const query = `
    query {
      Page(page: 1, perPage: ${limit}) {
        media(sort: TRENDING_DESC, type: MANGA) {
          id
          title {
            romaji
            english
          }
          description
          coverImage {
            large
            extraLarge
          }
          bannerImage
          chapters
          volumes
          status
          averageScore
          genres
        }
      }
    }
  `;

  const data = await fetchFromAniList(query);
  return data.Page.media;
}

// Fetch manga by ID
export async function getMangaById(id: string | number) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        id
        title {
          english
          romaji
          native
        }
        description
        format
        status
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        chapters
        volumes
        coverImage {
          large
          extraLarge
          color
        }
        bannerImage
        genres
        synonyms
        averageScore
        popularity
        favourites
        trending
        isAdult
        siteUrl
        tags {
          id
          name
          description
          category
          rank
        }
        staff {
          edges {
            id
            role
            node {
              id
              name {
                full
                native
              }
              image {
                large
                medium
              }
            }
          }
        }
        characters(sort: ROLE, page: 1, perPage: 20) {
          edges {
            id
            role
            node {
              id
              name {
                full
                native
              }
              image {
                large
                medium
              }
              gender
              age
              description
            }
          }
          nodes {
            id
            name {
              full
              native
            }
            image {
              large
              medium
            }
            gender
            age
            description
          }
        }
        recommendations(sort: RATING_DESC) {
          edges {
            node {
              mediaRecommendation {
                id
                title {
                  english
                  romaji
                  native
                }
                coverImage {
                  large
                  extraLarge
                  color
                }
                averageScore
                format
                type
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id },
      }),
      cache: 'no-store',
    });

    const { data } = await response.json();
    if (!data || !data.Media) {
      console.error('No manga data found for ID:', id);
      return null;
    }
    
    // Process character data
    if (data.Media.characters) {
      // Create a map of node IDs to roles
      const roleMap = new Map();
      if (data.Media.characters.edges) {
        data.Media.characters.edges.forEach((edge: any) => {
          roleMap.set(edge.node.id, edge.role);
        });
      }
      
      // Enhance node data with role information
      if (data.Media.characters.nodes) {
        data.Media.characters.nodes = data.Media.characters.nodes.map((node: any) => {
          return {
            ...node,
            role: roleMap.get(node.id) || 'SUPPORTING'
          };
        });
      }
      
      console.log(`Processed ${data.Media.characters.nodes?.length || 0} characters with roles`);
    }
    
    console.log('AniList API - Character data received:', {
      hasCharacters: !!data.Media.characters,
      nodeCount: data.Media.characters?.nodes?.length || 0,
      edgeCount: data.Media.characters?.edges?.length || 0
    });

    return data.Media;
  } catch (error) {
    console.error('Error fetching manga by ID:', error);
    return null;
  }
}

// Helper function to fetch from AniList API
async function fetchFromAniList(query: string, variables = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      }),
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    const json = await response.json();
    
    if (json.errors) {
      console.error('AniList API Error:', json.errors);
      throw new Error(json.errors[0].message);
    }
    
    return json.data;
  } catch (error) {
    console.error('Error fetching from AniList:', error);
    throw error;
  }
}

// Utils to format AniList data
export function formatDate(startDate: any, endDate?: any) {
  if (!startDate || !startDate.year) return 'TBA';
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const start = startDate.month ? `${months[startDate.month - 1]} ${startDate.year}` : startDate.year;
  
  if (endDate && endDate.year) {
    const end = endDate.month ? `${months[endDate.month - 1]} ${endDate.year}` : endDate.year;
    return `${start} - ${end}`;
  }
  
  return start;
}

export function formatAiringTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatStatus(status: string) {
  switch (status) {
    case 'RELEASING':
      return 'Releasing';
    case 'FINISHED':
      return 'Completed';
    case 'NOT_YET_RELEASED':
      return 'Coming Soon';
    case 'CANCELLED':
      return 'Cancelled';
    case 'HIATUS':
      return 'On Hiatus';
    default:
      return status;
  }
}

export function getSeasonName(season: string) {
  if (!season) return '';
  
  return season.charAt(0) + season.slice(1).toLowerCase();
}

export function stripHtml(html: string) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

export function getAiringDay(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
} 