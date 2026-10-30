import { AuthService } from "./AuthService.js"
import { GeocodeService } from "./GeocodeService.js"
import { NearbyService } from "./NearbyService.js"
import { RouteService } from "./RouteService.js"
import { WeatherService } from "./WeatherService.js"

export function createServices({ models, config, liveApis }) {
  return {
    auth: new AuthService({
      users: models.users,
      jwtSecret: config.jwtSecret,
      jwtExpiresIn: config.jwtExpiresIn,
      bcryptRounds: config.bcryptRounds,
    }),
    weather: new WeatherService({ liveApis }),
    routes: new RouteService({ liveApis }),
    geocode: new GeocodeService({ destinations: models.destinations, liveApis }),
    nearby: new NearbyService({ places: models.places, liveApis }),
  }
}
