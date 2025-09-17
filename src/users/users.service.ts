import { Injectable }                     from '@nestjs/common';
import { InjectModel }                    from '@nestjs/mongoose';
import { Model }                          from 'mongoose';
import { User, UserDocument }             from './schemas/user.schema';
import * as bcrypt                        from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(email: string, password: string): Promise<User> {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password, salt);
    return this.userModel.create({ email, passwordHash: hash });
  }

  async findByEmail(email: string): Promise<User|null> {
    return this.userModel.findOne({ email }).exec();
  }
}
