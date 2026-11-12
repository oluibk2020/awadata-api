import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import {  RegisterCredentialsDto, UpdateCredentialsDto } from 'src/user/dto/register-credentials.dto';
import { Logger } from '@nestjs/common';
import { Request } from 'express'; // <-- import Request type
import { AdminOnly } from 'src/auth/guards/admin-decorator';
import { ResponseMessage } from 'src/helpers/message.interface';
import { AuthGuard } from '@nestjs/passport';
import { JwtUser } from 'src/auth/dto/jwt-user.interface';

@Controller("user")
export class UserController {
  private logger = new Logger("TasksController");
  constructor(private usersService: UserService) {}

  //protect this route
  @UseGuards(AuthGuard("jwt"))
  @Get("/")
  async getUser(@Req() req: Request & { user: JwtUser }): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    id: string;
    role: string;
  }> {
    this.logger.verbose(`Getting a user`);
    return this.usersService.getUserByEmail(req.user.email);
  }
  //protect this route
  @UseGuards(AuthGuard("jwt"))
  @Patch("/update")
  async updateUser(
    @Req() req: Request & { user: JwtUser },
    @Body()
    updateCredentialsDto: UpdateCredentialsDto,
  ): Promise<ResponseMessage> {
    this.logger.verbose(`Updating a user`);
    return this.usersService.updateUser(
      req.user.email,
      updateCredentialsDto.firstName,
      updateCredentialsDto.lastName
    );
  }

  @Post("/register")
  async createUser(
    @Body()
    registerCredentialsDto: RegisterCredentialsDto,
  ): Promise<ResponseMessage> {
    return this.usersService.createUser(registerCredentialsDto, {
      referralCode: registerCredentialsDto.referralCode,
    });
  }

  @Get("/directory")
  @AdminOnly()
  getDirectory() {
    return this.usersService.getDirectory();
  }
}
