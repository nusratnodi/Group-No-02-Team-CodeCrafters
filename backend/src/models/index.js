import { DestinationModel } from "./DestinationModel.js"
import { ExpenseModel } from "./ExpenseModel.js"
import { FavoriteModel } from "./FavoriteModel.js"
import { NewsletterModel } from "./NewsletterModel.js"
import { PlaceModel } from "./PlaceModel.js"
import { ReviewModel } from "./ReviewModel.js"
import { TripModel } from "./TripModel.js"
import { UserModel } from "./UserModel.js"

export function createModels(db) {
  const destinations = new DestinationModel(db)
  const places = new PlaceModel(db)
  return {
    users: new UserModel(db),
    destinations,
    places,
    reviews: new ReviewModel(db),
    favorites: new FavoriteModel(db, { destinations, places }),
    trips: new TripModel(db),
    expenses: new ExpenseModel(db),
    newsletter: new NewsletterModel(db),
  }
}
