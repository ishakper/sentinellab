import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateResearchProjectDto, UpdateResearchProjectDto } from './dto';
import { ResearchProjectsService } from './research-projects.service';

@ApiTags('Research Projects')
@ApiBearerAuth('access-token')
@Controller('research-projects')
export class ResearchProjectsController {
  constructor(private readonly researchProjectsService: ResearchProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List research projects for current organization' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.researchProjectsService.findAll(currentUser.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get research project for current organization' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.researchProjectsService.findOne(id, currentUser.organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create research project for current organization' })
  create(@Body() dto: CreateResearchProjectDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.researchProjectsService.create(dto, currentUser.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update research project for current organization' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResearchProjectDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.researchProjectsService.update(id, dto, currentUser.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete research project for current organization' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.researchProjectsService.remove(id, currentUser.organizationId);
  }
}
