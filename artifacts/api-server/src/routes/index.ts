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
import authRouter from "./auth";
import assistantRouter from "./assistant";
import savedRoutesRouter from "./savedRoutes";
import notificationsRouter from "./notifications";
import refundsRouter from "./refunds";
import preferencesRouter from "./preferences";
import passesRouter from "./passes";

const router: IRouter = Router();

router.use(authRouter);
router.use(assistantRouter);
router.use(healthRouter);
router.use(routesRouter);
router.use(busesRouter);
router.use(searchRouter);
router.use(bookingsRouter);
router.use(passengersRouter);
router.use(savedRoutesRouter);
router.use(notificationsRouter);
router.use(refundsRouter);
router.use(preferencesRouter);
router.use(passesRouter);
router.use(trackingRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
