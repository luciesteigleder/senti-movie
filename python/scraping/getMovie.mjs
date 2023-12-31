import cheerio from "cheerio";
import mongoose from "mongoose";
import {
  connection,
  Review,
  MovieID,
  disconnectFromDatabase,
} from "./database.mjs";

//empty the db before putting a new document
const deleteAllMovieIDs = async (model) => {
  try {
    await model.deleteMany({});
    console.log(`All documents deleted from the  collection.`);
  } catch (error) {
    console.error("Error deleting documents:", error);
  }
};

//get the 25 first reviews
const getReviews = async (axios, movieURL) => {
  try {
    deleteAllMovieIDs(Review);

    const response2 = await axios.get(
      `https://www.imdb.com${movieURL}reviews?sort=submissionDate&dir=desc&ratingFilter=0`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        },
      }
    );
    const html2 = response2.data;

    const $ = cheerio.load(html2);
    const reviewDivs = $(
      "div.lister-item.mode-detail.imdb-user-review.collapsable"
    );

    const promises = reviewDivs
      .map(async (index, element) => {
        const reviewScore = $(element)
          .find("span.rating-other-user-rating span")
          .text()
          .trim()
          .split("/")[0];
        // console.log(reviewScore);

        const reviewText = $(element)
          .find("div.text.show-more__control")
          .text();
        // console.log(reviewText);

        const newText = new Review({
          reviewScore: reviewScore,
          reviewText: reviewText,
        });
        console.log(newText);
        await newText.save();
      })
      .get();

    await Promise.all(promises);
  } catch (error) {
    console.error("Error:", error);
  }
};

export const fetchData = async (axios, movieName) => {
  try {
    await connection();
    // console.log("connection to the DB established");

    // await deleteAllMovieIDs(MovieID);
    console.log(movieName);
    const response = await axios.get(
      `https://www.imdb.com/find/?q=${movieName}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        },
      }
    );
    const html = response.data;
    const $ = cheerio.load(html);

    const linkElements = $(
      "div.ipc-metadata-list-summary-item__c a.ipc-metadata-list-summary-item__t"
    );

    const href = linkElements.first().attr("href");

    const data = {};
    data.movieName = movieName;
    data.movieID = href;

    const movieURL = data.movieID.split("?")[0];
    // data.movieID = data.movieID.split("?")[0];

    // console.log(movieURL);

    // await MovieID.create(data);

    await getReviews(axios, movieURL);

    await disconnectFromDatabase();
    console.log("Disconnected from the database");
  } catch (error) {
    console.error("Error:", error);
  }
};
