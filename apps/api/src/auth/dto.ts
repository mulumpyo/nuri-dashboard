import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

export class InviteDto {
  @ApiProperty({ example: "kim@mulumpyo.com", description: "초대하거나 로그인할 이메일이에요" })
  @IsEmail()
  email: string;
}

export class LoginDto extends InviteDto {}

export class AcceptInviteDto {
  @ApiProperty({ description: "메일 속 링크에 들어 있는 토큰이에요" })
  @IsString()
  token: string;

  @ApiPropertyOptional({ description: "새로 만들 비밀번호예요. 8자 이상, 문자와 숫자를 함께 넣어 주세요" })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: "비밀번호는 8자 이상이어야 해요" })
  @MaxLength(128, { message: "비밀번호가 너무 길어요" })
  @Matches(/(?=.*[A-Za-z가-힣])(?=.*\d)/, { message: "문자와 숫자를 함께 넣어 주세요" })
  password?: string;
}

export class TotpRequiredDto {
  @ApiProperty({ example: false, description: "다음 로그인부터 인증 앱을 쓸지예요" })
  @IsBoolean()
  totpRequired: boolean;
}

export class TotpVerifyDto {
  @ApiPropertyOptional({ example: "123456", description: "인증 앱에 보이는 6자리 번호예요" })
  @IsOptional()
  @ValidateIf((_, value) => Boolean(value))
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code?: string;

  @ApiPropertyOptional({ description: "로그인 시작에서 받은 도전 키예요" })
  @IsOptional()
  @IsString()
  challengeKey?: string;

  @ApiPropertyOptional({ description: "로그인할 이메일이에요" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "이미 있는 계정의 비밀번호예요" })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: "비밀번호는 8자 이상이어야 해요" })
  @MaxLength(128, { message: "비밀번호가 너무 길어요" })
  password?: string;
}

export class RecoveryDto {
  @ApiProperty({ description: "비밀번호 메일을 받을 이메일이에요. 없어도 같은 답을 드려요" })
  @IsEmail()
  email: string;
}

export class RefreshOkDto {
  @ApiProperty({ example: "ok", description: "잘 처리됐으면 ok예요" })
  @IsOptional()
  @IsString()
  status?: string;
}
