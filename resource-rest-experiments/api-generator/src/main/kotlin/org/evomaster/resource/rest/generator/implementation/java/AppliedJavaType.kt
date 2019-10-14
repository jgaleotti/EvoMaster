package org.evomaster.resource.rest.generator.implementation.java

import org.evomaster.resource.rest.generator.model.CommonTypes
import org.evomaster.resource.rest.generator.template.ConstantTypeScript

/**
 * created by manzh on 2019-08-20
 */
class AppliedJavaType : ConstantTypeScript {

    private val map = CommonTypes.values().map {
        when(it){
            CommonTypes.BOOLEAN -> Pair(it, "boolean")
            CommonTypes.STRING -> Pair(it, "String")
            CommonTypes.OBJ_BOOLEAN -> Pair(it, "Boolean")
            CommonTypes.OBJ_DOUBLE -> Pair(it, "Double")
            CommonTypes.OBJ_INT -> Pair(it, "Integer")
            CommonTypes.OBJ_LONG -> Pair(it, "Long")
            else-> Pair(it, it.name.toLowerCase())
        }
    }.toMap()

    override fun getCommonType(type: CommonTypes): String = map.getValue(type)

    override fun getAllCommonTypes(): Map<CommonTypes, String> = map

    override fun getTypes(): Map<String, String> = mapOf(
            "ResponseEntity" to "ResponseEntity",
            "Docket" to "Docket",
            "ApiInfo" to "ApiInfo",
            "String[]" to "String[]",
            "Class<?>" to "Class<?>",
            "ConfigurableApplicationContext" to "ConfigurableApplicationContext",
            "int" to "int",
            "Connection" to "Connection",
            "ProblemInfo" to "ProblemInfo",
            "List<AuthenticationDto>" to "List<AuthenticationDto>",
            "SutInfoDto.OutputFormat" to  "SutInfoDto.OutputFormat",
            "InstrumentedSutStarter" to "InstrumentedSutStarter",
            "SutController" to "SutController",
            "RemoteController" to "RemoteController"

    )

    override fun getGenericTypes(list: List<String>): Map<String, String> {
        val map = mutableMapOf<String, String>()
        list.forEach {
            map.put("ResponseEntity<List<$it>>", "ResponseEntity<List<$it>>")
            map.put("ResponseEntity<$it>","ResponseEntity<$it>")
        }
        return map
    }
}