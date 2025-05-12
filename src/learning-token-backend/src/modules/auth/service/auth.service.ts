import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Institution } from 'src/modules/institutions/entities/institution.entity'
import { Instructor } from 'src/modules/instructors/entities/instructor.entity'
import { Learner } from 'src/modules/learners/entities/learner.entity'
import { Repository } from 'typeorm'
import {
    LoginRequestDto,
    RegisterRequestDto,
    ValidateRequestDto
} from '../dto/auth.dto'
import { JwtService } from './jwt.service'
import { getWallet } from 'src/utils/kaledio'
import { User } from 'src/modules/admins/entities/user.entity'
import { Role } from 'src/modules/role/entities/role.entity'
import { SmartcontractFunctionsEnum } from 'src/modules/smartcontract/enums/smartcontract-functions.enum'
import { SmartcontractService } from 'src/modules/smartcontract/smartcontract.service'

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Institution)
        private readonly institutionRepository: Repository<Institution>,
        @InjectRepository(Learner)
        private readonly learnerRepository: Repository<Learner>,
        @InjectRepository(Instructor)
        private readonly instructorRepository: Repository<Instructor>,
        @Inject(JwtService)
        private readonly jwtService: JwtService,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        private readonly smartContractService: SmartcontractService
    ) {}

    /**
     * REGISTRATION OF A USER
     */
    public async register({
        name,
        email,
        password,
        type,
        latitude,
        longitude
    }: any) {
        try {
            if (type == 'Admin') {
                const user = new User()
                user.name = name
                user.email = email
                user.password = this.jwtService.encodePassword(password)
                const registeredUser = await this.userRepository.save(user)
                return {
                    id: registeredUser.id,
                    name: registeredUser.name,
                    email: registeredUser.email,
                    token: null,
                    createdAt: registeredUser.createdAt,
                    updatedAt: registeredUser.updatedAt
                }
            } else if (type == 'Institution') {
                const user = new Institution()
                user.name = name
                user.email = email
                user.password = this.jwtService.encodePassword(password)
                user.latitude = latitude
                user.longitude = longitude

                const role = await this.roleRepository.findOne({
                    where: {
                        name: 'institution'
                    }
                })
                user.roleId = role.id // default to institution

                const registeredUser = await this.institutionRepository.save(
                    user
                )
                const wallet = await getWallet('institution', registeredUser.id)
                await this.institutionRepository.update(registeredUser.id, {
                    publicAddress: wallet.address,
                    role: role
                })
                return {
                    id: registeredUser.id,
                    name: registeredUser.name,
                    email: registeredUser.email,
                    token: null,
                    createdAt: registeredUser.createdAt,
                    updatedAt: registeredUser.updatedAt
                }
                //no longer registering from the api
            } else if (type == 'Learner') {
                const user = new Learner()
                user.name = name
                user.email = email
                user.password = this.jwtService.encodePassword(password)

                const role = await this.roleRepository.findOne({
                    where: {
                        name: 'learner'
                    }
                })
                user.role = role // default to institution
                user.latitude = latitude
                user.longitude = longitude
                const registeredUser = await this.learnerRepository.save(user)

                const wallet = await getWallet('learner', registeredUser.id)
                await this.learnerRepository.update(registeredUser.id, {
                    publicAddress: wallet.address
                })
                const body = {
                    type: 'learner',
                    id: registeredUser.id,
                    functionName: SmartcontractFunctionsEnum.REGISTER_LEARNER,
                    params: [
                        registeredUser.name,
                        new Date(registeredUser.createdAt).getTime(),
                        latitude,
                        longitude
                    ]
                }
                body.type = 'learner'
                await this.smartContractService.onboardingActor(body, {})

                return {
                    id: registeredUser.id,
                    name: registeredUser.name,
                    email: registeredUser.email,
                    token: null,
                    createdAt: registeredUser.createdAt,
                    updatedAt: registeredUser.updatedAt
                }
            } else if (type == 'Instructor') {
                const user = new Instructor()
                user.name = name
                user.email = email
                user.password = this.jwtService.encodePassword(password)

                const role = await this.roleRepository.findOne({
                    where: {
                        name: 'instructor'
                    }
                })

                user.roleId = role.id // default to institution
                const registeredUser = await this.instructorRepository.save(
                    user
                )
                const wallet = await getWallet('instructor', registeredUser.id)
                await this.instructorRepository.update(registeredUser.id, {
                    publicAddress: wallet.address,
                    role: role
                })
                console.log(
                    '  new Date(registeredUser.createdAt).getTime()',
                    new Date(registeredUser.createdAt).getTime()
                )
                const body = {
                    type: 'instructor',
                    id: registeredUser.id,
                    functionName:
                        SmartcontractFunctionsEnum.REGISTER_INSTRUCTOR,
                    params: [
                        registeredUser.name,
                        new Date(registeredUser.createdAt).getTime()
                    ]
                }
                await this.smartContractService.onboardingActor(body, {})
                return {
                    id: registeredUser.id,
                    name: registeredUser.name,
                    email: registeredUser.email,
                    token: null,
                    createdAt: registeredUser.createdAt,
                    updatedAt: registeredUser.updatedAt
                }
            }
        } catch (error) {
            throw new BadRequestException("User couldn't be created")
        }
    }

    public async adminLogin(loginRequestDto: LoginRequestDto) {
        const user = await this.userRepository.findOne({
            where: { email: loginRequestDto.email },
            relations: ['role']
        })
        if (!user) {
            // IF USER NOT FOUND
            return
        }

        const isPasswordValid: boolean = this.jwtService.isPasswordValid(
            loginRequestDto.password,
            user.password
        )

        if (!isPasswordValid) {
            // IF PASSWORD DOES NOT MATCH
            return
        }

        const token: string = this.jwtService.generateToken(user, 'admin')

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            publicAddress: user.publicAddress,
            token: token,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role.name
        }
    }

    /**
     * AUTHENTICATING A USER
     */
    public async login(loginRequestDto: LoginRequestDto) {
        let user = null
        if (loginRequestDto.type == 'Instructor') {
            //find instructor
            user = await this.instructorRepository.findOne({
                where: { email: loginRequestDto.email },
                relations: ['role']
            })
        } else if (loginRequestDto.type == 'Institution') {
            user = await this.institutionRepository.findOne({
                where: { email: loginRequestDto.email },
                relations: ['role']
            })
        } else if (loginRequestDto.type == 'Learner') {
            user = await this.learnerRepository.findOne({
                where: { email: loginRequestDto.email },
                relations: ['role']
            })
        }
        if (!user) {
            // IF USER NOT FOUND
            return
        }
        console.log('user', user)

        const isPasswordValid: boolean = this.jwtService.isPasswordValid(
            loginRequestDto.password,
            user.password
        )

        if (!isPasswordValid) {
            // IF PASSWORD DOES NOT MATCH
            return
        }

        const token: string = this.jwtService.generateToken(
            user,
            user.role.name
        )

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            publicAddress: user.publicAddress,
            token: token,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role.name
        }
    }

    /**
     * VALIDATING A USER
     */
    public async validate({ token }: ValidateRequestDto) {
        const decoded: any = await this.jwtService.verify(token)

        if (!decoded) {
            throw new ForbiddenException('Invalid Access Token')
        }

        const user = await this.jwtService.validateUser(decoded)

        if (!user) {
            // IF USER NOT FOUND
            return
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            token: token,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }
    }

    /**
     * REFRESHING TOKEN FOR AN EXISTING USER
     */
    public refreshToken(loggedInUser: any) {
        return this.jwtService.generateToken(loggedInUser, 'institution')
    }
}
