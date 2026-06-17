export class JwtConstants {
    static secret = process.env.JWT_SECRET || 'DO_NOT_USE_THIS_VALUE_IN_PRODUCTION_SECRET_KEY';
}
