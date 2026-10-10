import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class StatusOkDto {
  @ApiProperty({ example: "ok", description: "잘 처리됐으면 ok예요" })
  status: string;
}

export class NamedRowDto {
  @ApiProperty({ description: "아이디예요" })
  id: string;

  @ApiProperty({ description: "이름이에요" })
  name: string;
}

export class CarrierRowDto {
  @ApiProperty({ description: "택배사 아이디예요" })
  id: string;

  @ApiProperty({ description: "택배사 이름이에요" })
  name: string;

  @ApiProperty({ description: "목록에서 보여줄 순서예요" })
  sortOrder: number;

  @ApiProperty({ description: "지금 쓰는 택배사인지예요" })
  active: boolean;
}

export class CompanyPageDto {
  @ApiProperty({ type: [NamedRowDto], description: "이 페이지에 보여줄 업체예요" })
  items: NamedRowDto[];

  @ApiProperty({ description: "지금 페이지예요" })
  page: number;

  @ApiProperty({ description: "마지막 페이지예요" })
  pages: number;

  @ApiProperty({ description: "전체 업체 수예요" })
  total: number;

  @ApiProperty({ description: "한 페이지 칸 수예요" })
  limit: number;
}

export class BulkDeletedDto {
  @ApiProperty({ description: "지운 개수예요" })
  deleted: number;
}

export class ShipmentRowDto {
  @ApiProperty({ description: "발송 아이디예요" })
  id: string;

  @ApiProperty({ description: "업체 아이디예요" })
  companyId: string;

  @ApiProperty({ description: "택배사 아이디예요" })
  carrierId: string;

  @ApiProperty({ example: "2026-09-23", description: "보내는 날이에요" })
  shipDate: string;

  @ApiProperty({ description: "상자 수예요" })
  boxCount: number;

  @ApiProperty({ enum: ["prepaid", "collect"], description: "선불이면 prepaid, 착불이면 collect예요" })
  payType: string;

  @ApiPropertyOptional({ example: "14:30", nullable: true, description: "퀵이면 출발 시각이에요" })
  shipTime?: string | null;

  @ApiProperty({ example: "7일건", description: "메모 라벨이에요. 없으면 빈 글이에요" })
  note: string;
}

export class BoardCompanyDto {
  @ApiProperty({ description: "업체 아이디예요" })
  companyId: string;

  @ApiProperty({ description: "업체 이름이에요" })
  name: string;

  @ApiProperty({ description: "상자 수예요" })
  boxCount: number;

  @ApiProperty({ description: "발송 아이디예요" })
  shipmentId: string;

  @ApiProperty({ enum: ["prepaid", "collect"], description: "결제 구분이에요" })
  payType: string;

  @ApiPropertyOptional({ nullable: true, description: "퀵이면 출발 시각이에요" })
  shipTime?: string | null;

  @ApiProperty({ example: "7일건", description: "메모 라벨이에요. 없으면 빈 글이에요" })
  note: string;
}

export class BoardCarrierDto {
  @ApiProperty({ description: "택배사 아이디예요" })
  carrierId: string;

  @ApiProperty({ description: "택배사 이름이에요" })
  name: string;

  @ApiProperty({ type: [BoardCompanyDto], description: "이 택배사로 나가는 업체예요" })
  companies: BoardCompanyDto[];
}

export class BoardDayDto {
  @ApiProperty({ description: "날짜예요. YYYY-MM-DD예요" })
  date: string;

  @ApiProperty({ description: "화면에 보여줄 날짜 이름이에요" })
  label: string;

  @ApiProperty({ description: "오늘이면 true예요" })
  isToday: boolean;

  @ApiProperty({ description: "내일이면 true예요. 내일은 오늘 + 1일이에요" })
  isTomorrow: boolean;

  @ApiProperty({ type: [BoardCarrierDto], description: "그날 택배사별 발송이에요" })
  carriers: BoardCarrierDto[];
}

export class BoardResponseDto {
  @ApiProperty({ description: "보드가 시작하는 날짜예요" })
  from: string;

  @ApiProperty({ example: "Asia/Seoul", description: "보드가 쓰는 시간대예요" })
  timezone: string;

  @ApiProperty({ type: [BoardDayDto], description: "영업일별 발송이에요" })
  days: BoardDayDto[];
}

export class HolidayRowDto {
  @ApiProperty({ description: "쉬는 날 날짜예요" })
  date: string;

  @ApiProperty({ description: "쉬는 날 이름이에요" })
  name: string;

  @ApiProperty({ description: "직접 넣었는지, 국가 공휴일인지예요" })
  source: string;
}

export class HolidaySyncDto {
  @ApiProperty({ enum: ["idle", "ok", "degraded"], description: "불러오기 상태예요. 키가 없으면 degraded예요" })
  status: string;

  @ApiPropertyOptional({ nullable: true, description: "마지막으로 가져온 시각이에요" })
  at?: string | null;

  @ApiProperty({ description: "가져온 날 수예요" })
  count: number;

  @ApiPropertyOptional({ description: "문제가 있으면 이유를 알려 드려요" })
  message?: string;
}

export class PairIssuedDto {
  @ApiProperty({ example: "123456", description: "TV에 보여줄 6자리 코드예요" })
  code: string;

  @ApiProperty({ example: 1800, description: "코드가 유효한 초예요" })
  expiresIn: number;
}

export class PairReadyDto {
  @ApiProperty({ example: "ok", description: "잘 처리됐으면 ok예요" })
  status: string;

  @ApiProperty({ description: "연결된 화면 아이디예요" })
  deviceId: string;
}

export class DeviceRowDto {
  @ApiProperty({ description: "화면 아이디예요" })
  id: string;

  @ApiProperty({ description: "화면 이름이에요" })
  name: string;

  @ApiPropertyOptional({ nullable: true, description: "마지막으로 본 시각이에요" })
  lastSeenAt?: string | null;

  @ApiPropertyOptional({ nullable: true, description: "연결을 끊은 시각이에요" })
  revokedAt?: string | null;
}

export class MeDto {
  @ApiProperty({ description: "admin이면 관리자, device면 화면이에요" })
  kind: string;

  @ApiPropertyOptional({ description: "사람 아이디예요" })
  id?: string;

  @ApiPropertyOptional({ description: "로그인 이메일이에요" })
  email?: string;

  @ApiPropertyOptional({ description: "owner면 최초 관리자예요" })
  role?: string;

  @ApiPropertyOptional({ description: "인증 앱을 쓰는지예요" })
  totpRequired?: boolean;

  @ApiPropertyOptional({ description: "인증 앱 설정을 바꿀 수 있는지예요" })
  canManageTotp?: boolean;

  @ApiPropertyOptional({ description: "계정을 초대하거나 지울 수 있는지예요" })
  canManageUsers?: boolean;

  @ApiPropertyOptional({ description: "최초 관리자면 true예요" })
  bootstrap?: boolean;

  @ApiPropertyOptional({ description: "화면이면 그 화면 아이디예요" })
  deviceId?: string;
}

export class AccountRowDto {
  @ApiProperty({ description: "계정 아이디예요" })
  id: string;

  @ApiProperty({ description: "이메일이에요" })
  email: string;

  @ApiProperty({ description: "역할이에요" })
  role: string;

  @ApiPropertyOptional({ description: "만든 시각이에요" })
  createdAt?: string;

  @ApiPropertyOptional({ description: "최초 관리자면 true예요" })
  bootstrap?: boolean;
}

export class InviteStatusDto {
  @ApiProperty({ enum: ["ok", "expired", "used", "missing"], description: "초대 링크 상태예요" })
  status: "ok" | "expired" | "used" | "missing";
}

export class RecoveryStatusDto {
  @ApiProperty({ enum: ["ok", "expired"], description: "비밀번호 링크 상태예요" })
  status: "ok" | "expired";
}

export class SecurityDto {
  @ApiProperty({ description: "인증 앱을 쓰는지예요" })
  totpRequired: boolean;

  @ApiProperty({ description: "이 설정을 바꿀 수 있는지예요" })
  canManageTotp: boolean;
}

export class SseEventDto {
  @ApiProperty({ example: "shipment.changed", description: "이벤트 종류예요. heartbeat와 device.revoked도 있어요" })
  type: string;

  @ApiPropertyOptional({ description: "관련된 날짜예요" })
  date?: string;

  @ApiPropertyOptional({ description: "관련된 발송 아이디예요" })
  shipmentId?: string;

  @ApiPropertyOptional({ description: "화면을 끊었을 때 그 화면 아이디예요" })
  deviceId?: string;
}

export class ActivityItemDto {
  @ApiProperty({ description: "언제 바꿨는지예요" })
  at: string;

  @ApiProperty({ description: "누가 바꿨는지예요. 소유자·관리자·화면·손님이에요" })
  actor: string;

  @ApiProperty({ description: "무엇을 했는지 한 줄로 알려 드려요" })
  talk: string;

  @ApiProperty({ description: "요청 아이디예요. 로그와 맞춰 볼 수 있어요" })
  requestId: string;

  @ApiProperty({ description: "처리에 성공했으면 true예요" })
  ok: boolean;

  @ApiProperty({ description: "관련된 이메일이에요. 로그인한 사람이나 초대한 주소예요" })
  email: string;

  @ApiProperty({ example: "work", description: "작업이면 work, 로그인이면 login이에요" })
  kind: string;

  @ApiProperty({ description: "지운 이름이나 바꾼 값처럼 자세한 대상이에요" })
  detail: string;
}

export class ActivityPageDto {
  @ApiProperty({ type: [ActivityItemDto], description: "지금 페이지의 로그예요" })
  items: ActivityItemDto[];

  @ApiProperty({ description: "지금 페이지 번호예요" })
  page: number;

  @ApiProperty({ description: "전체 페이지 수예요" })
  pages: number;

  @ApiProperty({ description: "조건에 맞는 전체 건수예요" })
  total: number;
}
