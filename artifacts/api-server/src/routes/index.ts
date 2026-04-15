import { Router, type IRouter } from "express";
import healthRouter from "./health";
import optmailsRouter from "./optmails";

const router: IRouter = Router();

router.use(healthRouter);
router.use(optmailsRouter);

export default router;
