import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notificationsRouter from "./notifications";
import callsRouter from "./calls";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/notifications", notificationsRouter);
router.use("/calls", callsRouter);

export default router;
