package com.foo.rest.examples.spring.branches;

import com.foo.rest.examples.spring.positiveinteger.PIApplication;
import org.evomaster.clientJava.controller.RestController;
import org.evomaster.clientJava.controllerApi.dto.AuthenticationDto;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.List;
import java.util.Map;

public class BranchesController extends RestController {

    private ConfigurableApplicationContext ctx;

    @Override
    public int getControllerPort(){
        return 0;
    }

    @Override
    public String startSut() {

        ctx = SpringApplication.run(BranchesApplication.class,
                new String[]{"--server.port=0"});


        return "http://localhost:"+getSutPort();
    }

    protected int getSutPort(){
        return (Integer)((Map) ctx.getEnvironment()
                .getPropertySources().get("server.ports").getSource())
                .get("local.server.port");
    }



    @Override
    public String startInstrumentedSut() {
        return startSut();
    }

    @Override
    public boolean isSutRunning() {
        return ctx!=null && ctx.isRunning(); //TODO check if correct
    }

    @Override
    public void stopSut() {
        ctx.stop();
    }

    @Override
    public String getPackagePrefixesToCover() {
        return "com.foo.";
    }

    @Override
    public void resetStateOfSUT() {
        //nothing to do
    }

    @Override
    public String getUrlOfSwaggerJSON() {
        return "http://localhost:"+getSutPort()+"/v2/api-docs";
    }

    @Override
    public List<AuthenticationDto> getInfoForAuthentication() {
        return null;
    }
}
