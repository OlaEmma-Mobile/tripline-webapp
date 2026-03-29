export {};

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ErrorEnvelope:
 *       type: object
 *       required:
 *         - hasError
 *         - data
 *         - message
 *         - description
 *         - errors
 *       properties:
 *         hasError:
 *           type: boolean
 *           example: true
 *         data:
 *           nullable: true
 *         message:
 *           type: string
 *         description:
 *           type: string
 *         errors:
 *           type: object
 *           additionalProperties:
 *             type: array
 *             items:
 *               type: string
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     RiderLoginResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *         email_verified:
 *           type: boolean
 *         has_ride_passcode:
 *           type: boolean
 *         account_status:
 *           type: string
 *         driver_kyc_status:
 *           type: string
 *           nullable: true
 *     AdminLoginResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *         role:
 *           type: string
 *           example: admin
 *         account_status:
 *           type: string
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *         emailVerified:
 *           type: boolean
 *         hasRidePasscode:
 *           type: boolean
 *         accountStatus:
 *           type: string
 *         driverKycStatus:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     RidePasscodeSetupRequest:
 *       type: object
 *       required:
 *         - passcode
 *       properties:
 *         passcode:
 *           type: string
 *           pattern: '^\\d{4}$'
 *           example: '1234'
 *     RidePasscodeChangeRequest:
 *       type: object
 *       required:
 *         - currentPasscode
 *         - newPasscode
 *       properties:
 *         currentPasscode:
 *           type: string
 *           pattern: '^\\d{4}$'
 *         newPasscode:
 *           type: string
 *           pattern: '^\\d{4}$'
 *     RidePasscodeResetRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *     RidePasscodeResetConfirmRequest:
 *       type: object
 *       required:
 *         - verifyToken
 *         - newPasscode
 *       properties:
 *         verifyToken:
 *           type: string
 *         newPasscode:
 *           type: string
 *           pattern: '^\\d{4}$'
 *     CreateBookingRequest:
 *       type: object
 *       required:
 *         - tripId
 *         - pickupPointId
 *         - seatCount
 *       properties:
 *         tripId:
 *           type: string
 *           format: uuid
 *         pickupPointId:
 *           type: string
 *           format: uuid
 *         seatCount:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *     CreateBookingResult:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *         tripId:
 *           type: string
 *           format: uuid
 *         rideInstanceId:
 *           type: string
 *           format: uuid
 *         riderId:
 *           type: string
 *           format: uuid
 *         pickupPointId:
 *           type: string
 *           format: uuid
 *         pickupPointLatitude:
 *           type: number
 *           nullable: true
 *         pickupPointLongitude:
 *           type: number
 *           nullable: true
 *         tokenCost:
 *           type: integer
 *         status:
 *           type: string
 *         seatCount:
 *           type: integer
 *         tokensDeducted:
 *           type: integer
 *         tokensRemaining:
 *           type: integer
 *         capacity:
 *           type: integer
 *         reservedSeats:
 *           type: integer
 *         availableSeats:
 *           type: integer
 *     PickupPoint:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         latitude:
 *           type: number
 *         longitude:
 *           type: number
 *         orderIndex:
 *           type: integer
 *         tokenCost:
 *           type: integer
 *     RouteSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         fromName:
 *           type: string
 *         toName:
 *           type: string
 *         fromLat:
 *           type: number
 *         fromLng:
 *           type: number
 *         toLat:
 *           type: number
 *         toLng:
 *           type: number
 *     RideInstanceSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         rideId:
 *           type: string
 *         rideDate:
 *           type: string
 *           format: date
 *         timeSlot:
 *           type: string
 *           enum: [morning, afternoon, evening]
 *         route:
 *           $ref: '#/components/schemas/RouteSummary'
 *     DriverSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *           nullable: true
 *     VehicleSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         registrationNumber:
 *           type: string
 *         model:
 *           type: string
 *         capacity:
 *           type: integer
 *     TripSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tripId:
 *           type: string
 *         driverTripId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [scheduled, awaiting_driver, ongoing, completed, cancelled]
 *         departureTime:
 *           type: string
 *           example: '06:30:00'
 *         estimatedDurationMinutes:
 *           type: integer
 *         capacity:
 *           type: integer
 *         reservedSeats:
 *           type: integer
 *         availableSeats:
 *           type: integer
 *     RiderTripDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/TripSummary'
 *         - type: object
 *           properties:
 *             rideInstance:
 *               $ref: '#/components/schemas/RideInstanceSummary'
 *             driver:
 *               $ref: '#/components/schemas/DriverSummary'
 *             vehicle:
 *               $ref: '#/components/schemas/VehicleSummary'
 *             pickupPoints:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PickupPoint'
 *     BoardingRespondRequest:
 *       type: object
 *       required:
 *         - decision
 *       properties:
 *         decision:
 *           type: string
 *           enum: [approve, decline]
 *         passcode:
 *           type: string
 *           pattern: '^\\d{4}$'
 *           nullable: true
 *         declineReason:
 *           type: string
 *           nullable: true
 *     VerifyBoardingPasscodeRequest:
 *       type: object
 *       required:
 *         - passcode
 *       properties:
 *         passcode:
 *           type: string
 *           pattern: '^\\d{4}$'
 *     BoardingActionResult:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *         bookingStatus:
 *           type: string
 *         boardingStatus:
 *           type: string
 *         boardingExpiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         boardingVerificationMethod:
 *           type: string
 *           nullable: true
 *     DriverManifestPassenger:
 *       type: object
 *       properties:
 *         bookingId:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         userName:
 *           type: string
 *         pickupPointId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         pickupPointName:
 *           type: string
 *           nullable: true
 *         pickupPointLatitude:
 *           type: number
 *           nullable: true
 *         pickupPointLongitude:
 *           type: number
 *           nullable: true
 *         bookingStatus:
 *           type: string
 *         boardingStatus:
 *           type: string
 *         boardingExpiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         boardingVerificationMethod:
 *           type: string
 *           nullable: true
 *     DriverManifestDetail:
 *       type: object
 *       properties:
 *         trip:
 *           $ref: '#/components/schemas/TripSummary'
 *         passengers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DriverManifestPassenger'
 *     CreateRideInstanceRequest:
 *       type: object
 *       required:
 *         - routeId
 *         - rideDate
 *         - timeSlots
 *       properties:
 *         routeId:
 *           type: string
 *           format: uuid
 *         rideDate:
 *           type: string
 *           format: date
 *         timeSlots:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *             enum: [morning, afternoon, evening]
 *         status:
 *           type: string
 *           enum: [scheduled, cancelled]
 *           nullable: true
 *     AdminRideInstanceListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         rideId:
 *           type: string
 *         rideDate:
 *           type: string
 *           format: date
 *         timeSlot:
 *           type: string
 *         status:
 *           type: string
 *         route:
 *           $ref: '#/components/schemas/RouteSummary'
 *         tripCount:
 *           type: integer
 *     AdminRideInstanceDetails:
 *       type: object
 *       properties:
 *         rideInstance:
 *           $ref: '#/components/schemas/RideInstanceSummary'
 *         trips:
 *           type: array
 *           items:
 *             allOf:
 *               - $ref: '#/components/schemas/TripSummary'
 *               - type: object
 *                 properties:
 *                   driver:
 *                     $ref: '#/components/schemas/DriverSummary'
 *                   vehicle:
 *                     $ref: '#/components/schemas/VehicleSummary'
 *         bookings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               bookingStatus:
 *                 type: string
 *               riderName:
 *                 type: string
 *               pickupPoint:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                     nullable: true
 *                   longitude:
 *                     type: number
 *                     nullable: true
 * tags:
 *   - name: Auth
 *     description: Rider and admin authentication endpoints.
 *   - name: Users
 *     description: Authenticated user profile and ride passcode endpoints.
 *   - name: Ride Instances
 *     description: Rider-facing ride template discovery endpoints.
 *   - name: Trips
 *     description: Trip details and driver operational trip actions.
 *   - name: Bookings
 *     description: Trip booking and boarding verification flows.
 *   - name: Driver Manifests
 *     description: Driver manifest endpoints scoped to trips.
 *   - name: Admin Ride Instances
 *     description: Admin ride-template creation and monitoring endpoints.
 */
