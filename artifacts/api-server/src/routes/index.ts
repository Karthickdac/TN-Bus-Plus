import { Router, type IRouter } from "express";
import healthRouter from "./health";
import routesRouter from "./routes";
import busesRouter from "./buses";
import searchRouter from "./search";
import bookingsRouter from "./bookings";
import passengersRouter from "./passengers";
import trackingRouter from "./tracking";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(routesRouter);
router.use(busesRouter);
router.use(searchRouter);
router.use(bookingsRouter);
router.use(passengersRouter);
router.use(trackingRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
