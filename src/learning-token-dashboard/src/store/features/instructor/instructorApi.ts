import { apiSlice } from "../api/apiSlice";

export const instructorApi = apiSlice
  .enhanceEndpoints({ addTagTypes: ["instructorAuth"] })
  .injectEndpoints({
    endpoints: (builder) => ({
      loginInstructor: builder.mutation<any, any>({
        query: (body) => ({
          url: "/auth/instructor-login",
          method: "POST",
          body,
        }),
        invalidatesTags: ["instructorAuth"],
      }),
      smartContractCallInstitution: builder.mutation<any, any>({
        query: (body) => ({
          url: "/smartcontract/smartcontract",
          method: "POST",
          body,
        }),
        invalidatesTags: ["instructorAuth"],
      }),
      registerInstructor: builder.mutation<any, any>({
        query: (body) => ({
          url: "/auth/instructor-register",
          method: "POST",
          body,
        }),
        invalidatesTags: ["instructorAuth"],
      }),
    }),
  });

export const {
  useLoginInstructorMutation,
  useRegisterInstructorMutation,
  useSmartContractCallInstitutionMutation,
} = instructorApi;
